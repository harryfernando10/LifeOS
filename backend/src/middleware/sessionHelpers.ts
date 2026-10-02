import type { Request, Response } from "express";
import {
  getClearSessionCookieOptions,
  getSessionCookieOptions,
  sessionCookieName,
} from "../config/session.js";
import { findValidSession } from "../services/sessionService.js";
import { signSessionId, unsignSessionId } from "../utils/sessionCookie.js";

export function readSignedSessionId(req: Request): string | null {
  const raw = req.cookies?.[sessionCookieName()];
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }
  return unsignSessionId(raw);
}

export function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(
    sessionCookieName(),
    signSessionId(sessionId),
    getSessionCookieOptions(),
  );
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(sessionCookieName(), getClearSessionCookieOptions());
}

export async function resolveSessionFromRequest(req: Request) {
  const sessionId = readSignedSessionId(req);
  if (!sessionId) {
    return null;
  }
  return findValidSession(sessionId);
}
