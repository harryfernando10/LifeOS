import {
  BillingInterval,
  CommitmentStatus,
  Prisma,
} from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { isNonEmptyString } from "../utils/strings.js";

const BILLING_INTERVALS = new Set<string>(Object.values(BillingInterval));
const COMMITMENT_STATUSES = new Set<string>(Object.values(CommitmentStatus));
const ACTION_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export type SubscriptionCreateInput = {
  name: string;
  provider: string | null;
  amount: Prisma.Decimal | null;
  currency: string;
  billingInterval: BillingInterval;
  nextBillingOn: Date | null;
  status: CommitmentStatus;
  actionUrl: string | null;
  notes: string | null;
};

export type SubscriptionUpdateInput = Partial<SubscriptionCreateInput>;

export type RecurringPaymentCreateInput = {
  name: string;
  payee: string | null;
  amount: Prisma.Decimal | null;
  currency: string;
  billingInterval: BillingInterval;
  nextDueOn: Date | null;
  status: CommitmentStatus;
  actionUrl: string | null;
  notes: string | null;
};

export type RecurringPaymentUpdateInput = Partial<RecurringPaymentCreateInput>;

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
      `${fieldName} must be at most ${200} characters.`,
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

function parseBillingInterval(value: unknown): BillingInterval {
  if (!isNonEmptyString(value) || !BILLING_INTERVALS.has(value)) {
    throw new AppError(400, "billingInterval is invalid.", "VALIDATION_ERROR");
  }
  return value as BillingInterval;
}

function parseStatus(value: unknown): CommitmentStatus {
  if (!isNonEmptyString(value) || !COMMITMENT_STATUSES.has(value)) {
    throw new AppError(400, "status is invalid.", "VALIDATION_ERROR");
  }
  return value as CommitmentStatus;
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

export function parseSubscriptionCreate(
  body: unknown,
): SubscriptionCreateInput {
  const record = requireObject(body);

  return {
    name: parseRequiredName(record.name),
    provider: parseOptionalNameField(record.provider, "provider") ?? null,
    amount: parseOptionalAmount(record.amount) ?? null,
    currency: parseCurrency(record.currency, true)!,
    billingInterval: parseBillingInterval(record.billingInterval),
    nextBillingOn: parseOptionalDate(record.nextBillingOn, "nextBillingOn") ?? null,
    status:
      record.status === undefined || record.status === ""
        ? CommitmentStatus.ACTIVE
        : parseStatus(record.status),
    actionUrl: parseOptionalActionUrl(record.actionUrl) ?? null,
    notes: parseOptionalText(record.notes, "notes", 4000) ?? null,
  };
}

export function parseSubscriptionUpdate(
  body: unknown,
): SubscriptionUpdateInput {
  const record = requireObject(body);
  const update: SubscriptionUpdateInput = {};

  if (record.name !== undefined) {
    update.name = parseRequiredName(record.name);
  }
  if (record.provider !== undefined) {
    update.provider = parseOptionalNameField(record.provider, "provider") ?? null;
  }
  if (record.amount !== undefined) {
    update.amount = parseOptionalAmount(record.amount) ?? null;
  }
  if (record.currency !== undefined) {
    update.currency = parseCurrency(record.currency, true)!;
  }
  if (record.billingInterval !== undefined) {
    update.billingInterval = parseBillingInterval(record.billingInterval);
  }
  if (record.nextBillingOn !== undefined) {
    update.nextBillingOn =
      parseOptionalDate(record.nextBillingOn, "nextBillingOn") ?? null;
  }
  if (record.status !== undefined) {
    update.status = parseStatus(record.status);
  }
  if (record.actionUrl !== undefined) {
    update.actionUrl = parseOptionalActionUrl(record.actionUrl) ?? null;
  }
  if (record.notes !== undefined) {
    update.notes = parseOptionalText(record.notes, "notes", 4000) ?? null;
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(400, "No fields to update.", "VALIDATION_ERROR");
  }

  return update;
}

export function parseRecurringPaymentCreate(
  body: unknown,
): RecurringPaymentCreateInput {
  const record = requireObject(body);

  return {
    name: parseRequiredName(record.name),
    payee: parseOptionalNameField(record.payee, "payee") ?? null,
    amount: parseOptionalAmount(record.amount) ?? null,
    currency: parseCurrency(record.currency, true)!,
    billingInterval: parseBillingInterval(record.billingInterval),
    nextDueOn: parseOptionalDate(record.nextDueOn, "nextDueOn") ?? null,
    status:
      record.status === undefined || record.status === ""
        ? CommitmentStatus.ACTIVE
        : parseStatus(record.status),
    actionUrl: parseOptionalActionUrl(record.actionUrl) ?? null,
    notes: parseOptionalText(record.notes, "notes", 4000) ?? null,
  };
}

export function parseRecurringPaymentUpdate(
  body: unknown,
): RecurringPaymentUpdateInput {
  const record = requireObject(body);
  const update: RecurringPaymentUpdateInput = {};

  if (record.name !== undefined) {
    update.name = parseRequiredName(record.name);
  }
  if (record.payee !== undefined) {
    update.payee = parseOptionalNameField(record.payee, "payee") ?? null;
  }
  if (record.amount !== undefined) {
    update.amount = parseOptionalAmount(record.amount) ?? null;
  }
  if (record.currency !== undefined) {
    update.currency = parseCurrency(record.currency, true)!;
  }
  if (record.billingInterval !== undefined) {
    update.billingInterval = parseBillingInterval(record.billingInterval);
  }
  if (record.nextDueOn !== undefined) {
    update.nextDueOn = parseOptionalDate(record.nextDueOn, "nextDueOn") ?? null;
  }
  if (record.status !== undefined) {
    update.status = parseStatus(record.status);
  }
  if (record.actionUrl !== undefined) {
    update.actionUrl = parseOptionalActionUrl(record.actionUrl) ?? null;
  }
  if (record.notes !== undefined) {
    update.notes = parseOptionalText(record.notes, "notes", 4000) ?? null;
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(400, "No fields to update.", "VALIDATION_ERROR");
  }

  return update;
}

export {
  BILLING_INTERVALS as COMMITMENT_BILLING_INTERVALS,
  COMMITMENT_STATUSES,
};
