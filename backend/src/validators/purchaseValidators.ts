import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { isNonEmptyString } from "../utils/strings.js";

export type PurchaseCreateInput = {
  name: string;
  purchasedOn: Date;
  amount: Prisma.Decimal | null;
  currency: string;
  vendor: string | null;
  notes: string | null;
  receiptDocumentId: string | null;
};

export type PurchaseUpdateInput = Partial<PurchaseCreateInput>;

export type WarrantyUpsertInput = {
  provider: string | null;
  startsOn: Date | null;
  endsOn: Date;
  terms: string | null;
  notes: string | null;
};

function requireObject(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object") {
    throw new AppError(400, "Invalid request body.", "VALIDATION_ERROR");
  }
  return body as Record<string, unknown>;
}

function parseRequiredName(value: unknown): string {
  if (!isNonEmptyString(value)) {
    throw new AppError(400, "name is required.", "VALIDATION_ERROR");
  }
  const name = value.trim();
  if (name.length > 200) {
    throw new AppError(
      400,
      "name must be at most 200 characters.",
      "VALIDATION_ERROR",
    );
  }
  return name;
}

function parseOptionalNameField(
  value: unknown,
  fieldName: string,
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
  if (trimmed.length > 200) {
    throw new AppError(
      400,
      `${fieldName} must be at most 200 characters.`,
      "VALIDATION_ERROR",
    );
  }
  return trimmed;
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

function parseOptionalAmount(
  value: unknown,
): Prisma.Decimal | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }

  const raw =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : null;

  if (raw === null || raw.length === 0) {
    throw new AppError(400, "amount is invalid.", "VALIDATION_ERROR");
  }

  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
    throw new AppError(
      400,
      "amount must be a number with up to 2 decimal places.",
      "VALIDATION_ERROR",
    );
  }

  const decimal = new Prisma.Decimal(raw);
  if (decimal.isNegative()) {
    throw new AppError(400, "amount cannot be negative.", "VALIDATION_ERROR");
  }
  if (decimal.greaterThan("9999999999.99")) {
    throw new AppError(400, "amount is too large.", "VALIDATION_ERROR");
  }
  return decimal;
}

function parseCurrency(value: unknown, required: boolean): string | undefined {
  if (value === undefined || value === "") {
    return required ? "INR" : undefined;
  }
  if (typeof value !== "string") {
    throw new AppError(400, "currency must be a string.", "VALIDATION_ERROR");
  }
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new AppError(
      400,
      "currency must be a 3-letter code.",
      "VALIDATION_ERROR",
    );
  }
  return currency;
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
      "receiptDocumentId must be a string.",
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
      "receiptDocumentId is invalid.",
      "VALIDATION_ERROR",
    );
  }
  return trimmed;
}

export function parsePurchaseCreate(body: unknown): PurchaseCreateInput {
  const record = requireObject(body);

  return {
    name: parseRequiredName(record.name),
    purchasedOn: parseRequiredDate(record.purchasedOn, "purchasedOn"),
    amount: parseOptionalAmount(record.amount) ?? null,
    currency: parseCurrency(record.currency, true)!,
    vendor: parseOptionalNameField(record.vendor, "vendor") ?? null,
    notes: parseOptionalText(record.notes, "notes", 4000) ?? null,
    receiptDocumentId: parseOptionalDocumentId(record.receiptDocumentId) ?? null,
  };
}

export function parsePurchaseUpdate(body: unknown): PurchaseUpdateInput {
  const record = requireObject(body);
  const update: PurchaseUpdateInput = {};

  if (record.name !== undefined) {
    update.name = parseRequiredName(record.name);
  }
  if (record.purchasedOn !== undefined) {
    update.purchasedOn = parseRequiredDate(record.purchasedOn, "purchasedOn");
  }
  if (record.amount !== undefined) {
    update.amount = parseOptionalAmount(record.amount) ?? null;
  }
  if (record.currency !== undefined) {
    update.currency = parseCurrency(record.currency, true)!;
  }
  if (record.vendor !== undefined) {
    update.vendor = parseOptionalNameField(record.vendor, "vendor") ?? null;
  }
  if (record.notes !== undefined) {
    update.notes = parseOptionalText(record.notes, "notes", 4000) ?? null;
  }
  if (record.receiptDocumentId !== undefined) {
    update.receiptDocumentId =
      parseOptionalDocumentId(record.receiptDocumentId) ?? null;
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(400, "No fields to update.", "VALIDATION_ERROR");
  }

  return update;
}

export function parseWarrantyUpsert(body: unknown): WarrantyUpsertInput {
  const record = requireObject(body);
  const endsOn = parseRequiredDate(record.endsOn, "endsOn");
  const startsOn = parseOptionalDate(record.startsOn, "startsOn") ?? null;

  if (startsOn && startsOn.getTime() > endsOn.getTime()) {
    throw new AppError(
      400,
      "startsOn cannot be after endsOn.",
      "VALIDATION_ERROR",
    );
  }

  return {
    provider: parseOptionalNameField(record.provider, "provider") ?? null,
    startsOn,
    endsOn,
    terms: parseOptionalText(record.terms, "terms", 4000) ?? null,
    notes: parseOptionalText(record.notes, "notes", 4000) ?? null,
  };
}
