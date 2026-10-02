import path from "node:path";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  MIME_BY_EXTENSION,
  type AllowedUploadMimeType,
} from "../config/upload.js";
import { AppError } from "../errors/AppError.js";

export type DetectedFileType = {
  mimeType: AllowedUploadMimeType;
  extension: string;
};

function bufferStartsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) {
    return false;
  }
  return bytes.every((byte, index) => buffer[index] === byte);
}

/**
 * Detect allowed file type from magic bytes. Does not trust client MIME/extension alone.
 */
export function detectAllowedFileType(buffer: Buffer): DetectedFileType | null {
  if (bufferStartsWith(buffer, [0x25, 0x50, 0x44, 0x46])) {
    return { mimeType: "application/pdf", extension: ".pdf" };
  }

  if (bufferStartsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { mimeType: "image/jpeg", extension: ".jpg" };
  }

  if (
    bufferStartsWith(buffer, [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
  ) {
    return { mimeType: "image/png", extension: ".png" };
  }

  // RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: ".webp" };
  }

  return null;
}

/**
 * Sanitize a user-provided original filename for metadata only.
 * Never used as a filesystem path component.
 */
export function sanitizeOriginalFileName(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") {
    return "upload";
  }

  const base = path.basename(raw.replace(/\\/g, "/")).trim();
  const cleaned = base
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 180);

  return cleaned.length > 0 ? cleaned : "upload";
}

export function assertSafeRelativeStorageKey(storageKey: string): void {
  if (!storageKey || storageKey.includes("\0")) {
    throw new AppError(400, "Invalid storage key.", "VALIDATION_ERROR");
  }

  const normalized = storageKey.replace(/\\/g, "/");
  if (
    normalized.startsWith("/") ||
    normalized.includes("..") ||
    normalized.split("/").some((part) => part.length === 0)
  ) {
    throw new AppError(400, "Invalid storage key.", "VALIDATION_ERROR");
  }
}

export function assertAllowedClientHints(
  originalFileName: string,
  clientMimeType: string | undefined,
): void {
  const lowerName = originalFileName.toLowerCase();
  const extension = path.extname(lowerName);
  if (
    !(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(extension)
  ) {
    throw new AppError(
      400,
      "Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP.",
      "UNSUPPORTED_FILE_TYPE",
    );
  }

  if (clientMimeType && clientMimeType.trim().length > 0) {
    const normalized = clientMimeType.trim().toLowerCase();
    const expected = MIME_BY_EXTENSION[extension];
    const allowed =
      (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(normalized) &&
      (normalized === expected ||
        (expected === "image/jpeg" &&
          (normalized === "image/jpeg" || normalized === "image/jpg")));

    if (!allowed) {
      throw new AppError(
        400,
        "File type does not match the declared content type.",
        "UNSUPPORTED_FILE_TYPE",
      );
    }
  }
}

export function assertDetectedTypeMatchesHints(
  detected: DetectedFileType,
  originalFileName: string,
): void {
  const extension = path.extname(originalFileName.toLowerCase());
  const expectedMime = MIME_BY_EXTENSION[extension];

  if (!expectedMime || expectedMime !== detected.mimeType) {
    throw new AppError(
      400,
      "File content does not match the file extension.",
      "UNSUPPORTED_FILE_TYPE",
    );
  }
}
