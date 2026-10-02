import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { getMaxUploadBytes } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

/**
 * Multipart upload middleware for a single `file` field.
 * Maps multer size/type errors to AppError without leaking internals.
 * File size limit is read per request so env/test overrides apply.
 */
export function documentUploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: getMaxUploadBytes(),
      files: 1,
      fields: 20,
    },
  });

  upload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new AppError(
            400,
            `File exceeds the maximum size of ${getMaxUploadBytes()} bytes.`,
            "FILE_TOO_LARGE",
          ),
        );
        return;
      }
      next(
        new AppError(
          400,
          "Invalid multipart upload.",
          "VALIDATION_ERROR",
        ),
      );
      return;
    }

    next(error);
  });
}
