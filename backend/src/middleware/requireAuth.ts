import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  clearSessionCookie,
  resolveSessionFromRequest,
} from "./sessionHelpers.js";

/**
 * Requires a valid HTTP-only session cookie.
 * Attaches safe user identity to req.authUser for ownership checks.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await resolveSessionFromRequest(req);
    if (!session) {
      clearSessionCookie(res);
      throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
    }

    req.authUser = {
      id: session.user.id,
      email: session.user.email,
    };
    next();
  } catch (error) {
    next(error);
  }
}
