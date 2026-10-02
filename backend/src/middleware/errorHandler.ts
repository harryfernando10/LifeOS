import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import type { ApiErrorBody } from "../types/api.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      error: err.message,
      code: err.code,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Do not leak stack traces, secrets, or driver details to clients.
  console.error("Unhandled error:", err instanceof Error ? err.message : "unknown");
  const body: ApiErrorBody = {
    error: "Internal server error.",
    code: "INTERNAL_ERROR",
  };
  res.status(500).json(body);
}
