import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  getSafeUserById,
  loginUser,
  logoutSession,
  registerUser,
} from "../services/authService.js";
import { parseAuthCredentials } from "../validators/authValidators.js";
import {
  clearSessionCookie,
  readSignedSessionId,
  setSessionCookie,
} from "../middleware/sessionHelpers.js";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = parseAuthCredentials(req.body);
    const { user, session } = await registerUser(email, password);
    setSessionCookie(res, session.id);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = parseAuthCredentials(req.body);
    const { user, session } = await loginUser(email, password);
    setSessionCookie(res, session.id);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = readSignedSessionId(req);
    if (sessionId) {
      await logoutSession(sessionId);
    }
    clearSessionCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.authUser) {
      throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
    }

    const user = await getSafeUserById(req.authUser.id);
    if (!user) {
      clearSessionCookie(res);
      throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}
