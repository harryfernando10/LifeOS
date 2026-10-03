import type { NextFunction, Request, Response } from "express";
import { getFrontendOrigin } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Reject browser state-changing requests from an origin other than the SPA.
 * Requests without Origin remain available to non-browser API clients.
 */
export function validateRequestOrigin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const requestOrigin = req.get("origin");
  if (!requestOrigin) {
    next();
    return;
  }

  try {
    const allowedOrigin = new URL(getFrontendOrigin()).origin;
    const suppliedOrigin = new URL(requestOrigin).origin;
    if (suppliedOrigin === allowedOrigin) {
      next();
      return;
    }
  } catch {
    // Invalid or opaque origins are rejected below.
  }

  next(new AppError(403, "Request origin is not allowed.", "ORIGIN_NOT_ALLOWED"));
}
