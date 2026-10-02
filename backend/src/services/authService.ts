import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { SafeUser } from "../types/auth.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  createSession,
  deleteSession,
  type SessionWithUser,
} from "./sessionService.js";

/**
 * Precomputed bcrypt hash used only to keep missing-user login timing closer
 * to existing-user login. Not a real account password.
 */
const TIMING_PAD_HASH =
  "$2b$12$TBEud633GczUmxDMy5qS6OE7XSAkeFiInVAnWovSoxmVSIyQBL016";

function toSafeUser(user: {
  id: string;
  email: string;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function registerUser(
  email: string,
  password: string,
): Promise<{ user: SafeUser; session: SessionWithUser }> {
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    const session = await createSession(user.id);
    return { user: toSafeUser(user), session };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "An account with this email already exists.",
        "EMAIL_TAKEN",
      );
    }
    throw error;
  }
}

/**
 * Authenticates credentials. Uses a uniform error message to avoid
 * revealing whether an email is registered.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: SafeUser; session: SessionWithUser }> {
  const invalid = new AppError(
    401,
    "Invalid email or password.",
    "INVALID_CREDENTIALS",
  );

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (!user) {
    await verifyPassword(password, TIMING_PAD_HASH);
    throw invalid;
  }

  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) {
    throw invalid;
  }

  const session = await createSession(user.id);
  return {
    user: toSafeUser({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    }),
    session,
  };
}

export async function logoutSession(sessionId: string): Promise<void> {
  await deleteSession(sessionId);
}

export async function getSafeUserById(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    return null;
  }

  return toSafeUser(user);
}
