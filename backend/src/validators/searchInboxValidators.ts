import { InboxItemStatus } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

export function parseSearchQuery(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError(400, "q must be a string.", "VALIDATION_ERROR");
  }
  const query = value.trim();
  if (query.length < 2 || query.length > 100) {
    throw new AppError(400, "q must be 2–100 characters.", "VALIDATION_ERROR");
  }
  return query;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "Invalid request body.", "VALIDATION_ERROR");
  }
  return value as Record<string, unknown>;
}

function optionalText(value: unknown, name: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > max) {
    throw new AppError(400, `${name} must be at most ${max} characters.`, "VALIDATION_ERROR");
  }
  return value.trim() || null;
}

function linkedDocument(value: unknown): string | null | undefined {
  const id = optionalText(value, "linkedDocumentId", 100);
  if (id && !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new AppError(400, "linkedDocumentId is invalid.", "VALIDATION_ERROR");
  }
  return id;
}

export function parseInboxCreate(body: unknown, fileName?: string) {
  const data = object(body);
  const title = optionalText(data.title, "title", 200) ?? fileName?.trim() ?? null;
  if (!title) throw new AppError(400, "title is required.", "VALIDATION_ERROR");
  const notes = optionalText(data.notes, "notes", 4000) ?? null;
  const linkedDocumentId = linkedDocument(data.linkedDocumentId) ?? null;
  if (data.status !== undefined && data.status !== InboxItemStatus.UNREVIEWED) {
    throw new AppError(400, "New inbox items must be UNREVIEWED.", "VALIDATION_ERROR");
  }
  return { title, notes, linkedDocumentId };
}

export function parseInboxUpdate(body: unknown) {
  const data = object(body);
  const update: { title?: string | null; notes?: string | null; linkedDocumentId?: string | null; status?: InboxItemStatus } = {};
  if (data.title !== undefined) {
    const title = optionalText(data.title, "title", 200);
    if (!title) throw new AppError(400, "title cannot be empty.", "VALIDATION_ERROR");
    update.title = title;
  }
  if (data.notes !== undefined) update.notes = optionalText(data.notes, "notes", 4000) ?? null;
  if (data.linkedDocumentId !== undefined) update.linkedDocumentId = linkedDocument(data.linkedDocumentId) ?? null;
  if (data.status !== undefined) {
    if (!Object.values(InboxItemStatus).includes(data.status as InboxItemStatus)) {
      throw new AppError(400, "status is invalid.", "VALIDATION_ERROR");
    }
    update.status = data.status as InboxItemStatus;
  }
  if (!Object.keys(update).length) throw new AppError(400, "No fields to update.", "VALIDATION_ERROR");
  return update;
}

export function parseInboxStatus(value: unknown): InboxItemStatus {
  if (!Object.values(InboxItemStatus).includes(value as InboxItemStatus)) {
    throw new AppError(400, "status is invalid.", "VALIDATION_ERROR");
  }
  return value as InboxItemStatus;
}
