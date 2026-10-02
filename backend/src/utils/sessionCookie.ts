import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "../config/env.js";

/**
 * Signs a session id for the HTTP-only cookie.
 * Format: <sessionId>.<hmac>
 */
export function signSessionId(sessionId: string): string {
  const signature = createHmac("sha256", getSessionSecret())
    .update(sessionId)
    .digest("base64url");
  return `${sessionId}.${signature}`;
}

/**
 * Verifies and returns the session id, or null if the cookie is invalid.
 */
export function unsignSessionId(signed: string): string | null {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot <= 0) {
    return null;
  }

  const sessionId = signed.slice(0, lastDot);
  const provided = signed.slice(lastDot + 1);
  if (!sessionId || !provided) {
    return null;
  }

  const expected = createHmac("sha256", getSessionSecret())
    .update(sessionId)
    .digest("base64url");

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null;
  }

  return sessionId;
}
