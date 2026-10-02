import type { CookieOptions } from "express";
import {
  getSessionCookieName,
  getSessionMaxAgeMs,
  isProduction,
} from "./env.js";

export const SESSION_COOKIE_PATH = "/";

export function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: SESSION_COOKIE_PATH,
    maxAge: getSessionMaxAgeMs(),
  };
}

export function getClearSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: SESSION_COOKIE_PATH,
  };
}

export function sessionCookieName(): string {
  return getSessionCookieName();
}
