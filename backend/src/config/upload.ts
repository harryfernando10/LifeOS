/**
 * Allowed vault upload MIME types and extensions (Phase 5).
 * Aligned with SRS examples: PDFs, receipts, invoices, screenshots, scans.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const MIME_BY_EXTENSION: Record<string, AllowedUploadMimeType> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
