import { prisma } from "../db/prisma.js";
import { getSessionMaxAgeMs } from "../config/env.js";

export type SessionWithUser = {
  id: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
  };
};

export async function createSession(userId: string): Promise<SessionWithUser> {
  const expiresAt = new Date(Date.now() + getSessionMaxAgeMs());
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
    },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
  return session;
}

export async function findValidSession(
  sessionId: string,
): Promise<SessionWithUser | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {
      /* already gone */
    });
    return null;
  }

  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
