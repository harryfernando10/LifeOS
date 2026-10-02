import {
  DeadlineStatus,
  RenewalKind,
  RenewalStatus,
} from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { isNonEmptyString } from "../utils/strings.js";

const DEADLINE_STATUSES = new Set<string>(Object.values(DeadlineStatus));
const RENEWAL_KINDS = new Set<string>(Object.values(RenewalKind));
const RENEWAL_STATUSES = new Set<string>(Object.values(RenewalStatus));
const ACTION_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export type DeadlineCreateInput = {
  title: string;
  dueOn: Date;
  status: DeadlineStatus;
  actionUrl: string | null;
  notes: string | null;
  linkedDocumentId: string | null;
};

export type DeadlineUpdateInput = Partial<DeadlineCreateInput>;

export type RenewalCreateInput = {
  title: string;
  kind: RenewalKind;
  dueOn: Date;
  status: RenewalStatus;
  actionUrl: string | null;
  notes: string | null;
  linkedDocumentId: string | null;
};

export type RenewalUpdateInput = Partial<RenewalCreateInput>;

function requireObject(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object") {
    throw new AppError(400, "Invalid request body.", "VALIDATION_ERROR");
  }
  return body as Record<string, unknown>;
}

function parseRequiredTitle(value: unknown): string {
  if (!isNonEmptyString(value)) {
    throw new AppError(400, "title is required.", "VALIDATION_ERROR");
  }
  const title = value.trim();
  if (title.length > 200) {
    throw new AppError(
      400,
      "title must be at most 200 characters.",
      "VALIDATION_ERROR",
    );
  }
  return title;
}

function parseRequiredDate(value: unknown, fieldName: string): Date {
  if (!isNonEmptyString(value)) {
    throw new AppError(
      400,
      `${fieldName} is required and must be an ISO date string (YYYY-MM-DD).`,
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

function parseOptionalText(
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

function parseOptionalActionUrl(
  value: unknown,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError(400, "actionUrl must be a string.", "VALIDATION_ERROR");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 2000) {
    throw new AppError(
      400,
      "actionUrl must be at most 2000 characters.",
      "VALIDATION_ERROR",
    );
  }
  if (!ACTION_URL_PATTERN.test(trimmed)) {
    throw new AppError(
      400,
      "actionUrl must be an http or https URL.",
      "VALIDATION_ERROR",
    );
  }
  return trimmed;
}

function parseOptionalDocumentId(
  value: unknown,
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
      "linkedDocumentId must be a string.",
      "VALIDATION_ERROR",
    );
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > 64) {
    throw new AppError(
      400,
      "linkedDocumentId is invalid.",
      "VALIDATION_ERROR",
    );
  }
  return trimmed;
}

function parseDeadlineStatus(value: unknown): DeadlineStatus {
  if (!isNonEmptyString(value) || !DEADLINE_STATUSES.has(value)) {
    throw new AppError(400, "status is invalid.", "VALIDATION_ERROR");
  }
  return value as DeadlineStatus;
}

function parseRenewalStatus(value: unknown): RenewalStatus {
  if (!isNonEmptyString(value) || !RENEWAL_STATUSES.has(value)) {
    throw new AppError(400, "status is invalid.", "VALIDATION_ERROR");
  }
  return value as RenewalStatus;
}

function parseRenewalKind(value: unknown): RenewalKind {
  if (!isNonEmptyString(value) || !RENEWAL_KINDS.has(value)) {
    throw new AppError(400, "kind is invalid.", "VALIDATION_ERROR");
  }
  return value as RenewalKind;
}

export function parseDeadlineCreate(body: unknown): DeadlineCreateInput {
  const record = requireObject(body);

  return {
    title: parseRequiredTitle(record.title),
    dueOn: parseRequiredDate(record.dueOn, "dueOn"),
    status:
      record.status === undefined || record.status === ""
        ? DeadlineStatus.OPEN
        : parseDeadlineStatus(record.status),
    actionUrl: parseOptionalActionUrl(record.actionUrl) ?? null,
    notes: parseOptionalText(record.notes, "notes", 4000) ?? null,
    linkedDocumentId: parseOptionalDocumentId(record.linkedDocumentId) ?? null,
  };
}

export function parseDeadlineUpdate(body: unknown): DeadlineUpdateInput {
  const record = requireObject(body);
  const update: DeadlineUpdateInput = {};

  if (record.title !== undefined) {
    update.title = parseRequiredTitle(record.title);
  }
  if (record.dueOn !== undefined) {
    update.dueOn = parseRequiredDate(record.dueOn, "dueOn");
  }
  if (record.status !== undefined) {
    update.status = parseDeadlineStatus(record.status);
  }
  if (record.actionUrl !== undefined) {
    update.actionUrl = parseOptionalActionUrl(record.actionUrl) ?? null;
  }
  if (record.notes !== undefined) {
    update.notes = parseOptionalText(record.notes, "notes", 4000) ?? null;
  }
  if (record.linkedDocumentId !== undefined) {
    update.linkedDocumentId =
      parseOptionalDocumentId(record.linkedDocumentId) ?? null;
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(400, "No fields to update.", "VALIDATION_ERROR");
  }

  return update;
}

export function parseRenewalCreate(body: unknown): RenewalCreateInput {
  const record = requireObject(body);

  return {
    title: parseRequiredTitle(record.title),
    kind:
      record.kind === undefined || record.kind === ""
        ? RenewalKind.OTHER
        : parseRenewalKind(record.kind),
    dueOn: parseRequiredDate(record.dueOn, "dueOn"),
    status:
      record.status === undefined || record.status === ""
        ? RenewalStatus.UPCOMING
        : parseRenewalStatus(record.status),
    actionUrl: parseOptionalActionUrl(record.actionUrl) ?? null,
    notes: parseOptionalText(record.notes, "notes", 4000) ?? null,
    linkedDocumentId: parseOptionalDocumentId(record.linkedDocumentId) ?? null,
  };
}

export function parseRenewalUpdate(body: unknown): RenewalUpdateInput {
  const record = requireObject(body);
  const update: RenewalUpdateInput = {};

  if (record.title !== undefined) {
    update.title = parseRequiredTitle(record.title);
  }
  if (record.kind !== undefined) {
    update.kind = parseRenewalKind(record.kind);
  }
  if (record.dueOn !== undefined) {
    update.dueOn = parseRequiredDate(record.dueOn, "dueOn");
  }
  if (record.status !== undefined) {
    update.status = parseRenewalStatus(record.status);
  }
  if (record.actionUrl !== undefined) {
    update.actionUrl = parseOptionalActionUrl(record.actionUrl) ?? null;
  }
  if (record.notes !== undefined) {
    update.notes = parseOptionalText(record.notes, "notes", 4000) ?? null;
  }
  if (record.linkedDocumentId !== undefined) {
    update.linkedDocumentId =
      parseOptionalDocumentId(record.linkedDocumentId) ?? null;
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(400, "No fields to update.", "VALIDATION_ERROR");
  }

  return update;
}
