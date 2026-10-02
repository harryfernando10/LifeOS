import {
  DocumentCategory,
  DocumentStatus,
} from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { isNonEmptyString } from "../utils/strings.js";

const CATEGORIES = new Set<string>(Object.values(DocumentCategory));
const STATUSES = new Set<string>(Object.values(DocumentStatus));

export type DocumentMetadataInput = {
  title: string;
  category: DocumentCategory;
  description: string | null;
  status: DocumentStatus;
  issuedOn: Date | null;
  expiresOn: Date | null;
  notes: string | null;
};

export type DocumentMetadataUpdateInput = {
  title?: string;
  category?: DocumentCategory;
  description?: string | null;
  status?: DocumentStatus;
  issuedOn?: Date | null;
  expiresOn?: Date | null;
  notes?: string | null;
};

function parseOptionalDate(
  value: unknown,
  fieldName: string,
): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError(
      400,
      `${fieldName} must be an ISO date string (YYYY-MM-DD).`,
      "VALIDATION_ERROR",
    );
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new AppError(
      400,
      `${fieldName} must be an ISO date string (YYYY-MM-DD).`,
      "VALIDATION_ERROR",
    );
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `${fieldName} is invalid.`, "VALIDATION_ERROR");
  }
  return date;
}

export function parseOptionalText(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError(
      400,
      `${fieldName} must be a string.`,
      "VALIDATION_ERROR",
    );
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > maxLength) {
    throw new AppError(
      400,
      `${fieldName} must be at most ${maxLength} characters.`,
      "VALIDATION_ERROR",
    );
  }
  return trimmed;
}

function parseCategory(value: unknown): DocumentCategory {
  if (!isNonEmptyString(value) || !CATEGORIES.has(value)) {
    throw new AppError(400, "category is invalid.", "VALIDATION_ERROR");
  }
  return value as DocumentCategory;
}

function parseStatus(value: unknown): DocumentStatus {
  if (!isNonEmptyString(value) || !STATUSES.has(value)) {
    throw new AppError(400, "status is invalid.", "VALIDATION_ERROR");
  }
  return value as DocumentStatus;
}

/**
 * Parse document metadata from multipart form fields or JSON body.
 */
export function parseDocumentCreateMetadata(
  body: unknown,
): DocumentMetadataInput {
  if (body === null || typeof body !== "object") {
    throw new AppError(400, "Invalid request body.", "VALIDATION_ERROR");
  }

  const record = body as Record<string, unknown>;

  if (!isNonEmptyString(record.title)) {
    throw new AppError(400, "title is required.", "VALIDATION_ERROR");
  }

  const title = record.title.trim();
  if (title.length > 200) {
    throw new AppError(
      400,
      "title must be at most 200 characters.",
      "VALIDATION_ERROR",
    );
  }

  const category =
    record.category === undefined || record.category === ""
      ? DocumentCategory.OTHER
      : parseCategory(record.category);

  const status =
    record.status === undefined || record.status === ""
      ? DocumentStatus.ACTIVE
      : parseStatus(record.status);

  const description =
    parseOptionalText(record.description, "description", 2000) ?? null;
  const notes = parseOptionalText(record.notes, "notes", 4000) ?? null;
  const issuedOn = parseOptionalDate(record.issuedOn, "issuedOn") ?? null;
  const expiresOn = parseOptionalDate(record.expiresOn, "expiresOn") ?? null;

  return {
    title,
    category,
    description,
    status,
    issuedOn,
    expiresOn,
    notes,
  };
}

export function parseDocumentUpdateMetadata(
  body: unknown,
): DocumentMetadataUpdateInput {
  if (body === null || typeof body !== "object") {
    throw new AppError(400, "Invalid request body.", "VALIDATION_ERROR");
  }

  const record = body as Record<string, unknown>;
  const update: DocumentMetadataUpdateInput = {};

  if (record.title !== undefined) {
    if (!isNonEmptyString(record.title)) {
      throw new AppError(400, "title cannot be empty.", "VALIDATION_ERROR");
    }
    const title = record.title.trim();
    if (title.length > 200) {
      throw new AppError(
        400,
        "title must be at most 200 characters.",
        "VALIDATION_ERROR",
      );
    }
    update.title = title;
  }

  if (record.category !== undefined) {
    update.category = parseCategory(record.category);
  }

  if (record.status !== undefined) {
    update.status = parseStatus(record.status);
  }

  if (record.description !== undefined) {
    update.description =
      parseOptionalText(record.description, "description", 2000) ?? null;
  }

  if (record.notes !== undefined) {
    update.notes = parseOptionalText(record.notes, "notes", 4000) ?? null;
  }

  if (record.issuedOn !== undefined) {
    update.issuedOn = parseOptionalDate(record.issuedOn, "issuedOn") ?? null;
  }

  if (record.expiresOn !== undefined) {
    update.expiresOn = parseOptionalDate(record.expiresOn, "expiresOn") ?? null;
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(400, "No fields to update.", "VALIDATION_ERROR");
  }

  return update;
}

export { CATEGORIES as DOCUMENT_CATEGORIES, STATUSES as DOCUMENT_STATUSES };
