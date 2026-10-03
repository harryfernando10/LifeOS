import { AppError } from "../errors/AppError.js";
import { DOCUMENT_CATEGORIES } from "./documentValidators.js";

export type AISuggestion = {
  kind: "document" | "receipt";
  category: string | null;
  title: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  description: string | null;
  name: string | null;
  purchasedOn: string | null;
  amount: string | null;
  currency: string | null;
  vendor: string | null;
  notes: string | null;
  warrantyProvider: string | null;
  warrantyStartsOn: string | null;
  warrantyEndsOn: string | null;
  warrantyTerms: string | null;
};

export type AIProcessResponse = {
  extractedText: string;
  textSource: "pdf-text" | "ocr";
  externalProviderUsed: boolean;
  suggestion: AISuggestion;
};

const suggestionKeys = new Set([
  "kind", "category", "title", "issuedOn", "expiresOn", "description",
  "name", "purchasedOn", "amount", "currency", "vendor", "notes",
  "warrantyProvider", "warrantyStartsOn", "warrantyEndsOn", "warrantyTerms",
]);
const resultKeys = new Set(["extractedText", "textSource", "externalProviderUsed", "suggestion"]);
const dates = ["issuedOn", "expiresOn", "purchasedOn", "warrantyStartsOn", "warrantyEndsOn"] as const;
const strings = ["title", "description", "name", "vendor", "notes", "warrantyProvider", "warrantyTerms"] as const;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AppError(502, "AI service returned an invalid result.", "AI_INVALID_RESPONSE");
  return value as Record<string, unknown>;
}

function optionalString(value: unknown, field: string, limit: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > limit) throw new AppError(502, `AI service returned an invalid ${field}.`, "AI_INVALID_RESPONSE");
  return value;
}

function optionalDate(value: unknown, field: string): string | null {
  const result = optionalString(value, field, 10);
  if (result === null) return null;
  const date = new Date(`${result}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== result) {
    throw new AppError(502, `AI service returned an invalid ${field}.`, "AI_INVALID_RESPONSE");
  }
  return result;
}

export function parseAIProcessResponse(value: unknown): AIProcessResponse {
  const result = record(value);
  if (Object.keys(result).some((key) => !resultKeys.has(key)) || typeof result.extractedText !== "string" || result.extractedText.length > 100_000 || !["pdf-text", "ocr"].includes(String(result.textSource)) || typeof result.externalProviderUsed !== "boolean") {
    throw new AppError(502, "AI service returned an invalid result.", "AI_INVALID_RESPONSE");
  }
  const raw = record(result.suggestion);
  if (Object.keys(raw).some((key) => !suggestionKeys.has(key)) || !["document", "receipt"].includes(String(raw.kind))) {
    throw new AppError(502, "AI service returned an invalid suggestion.", "AI_INVALID_RESPONSE");
  }
  const category = optionalString(raw.category, "category", 32);
  if (category !== null && !DOCUMENT_CATEGORIES.has(category)) throw new AppError(502, "AI service returned an invalid category.", "AI_INVALID_RESPONSE");
  const suggestion = Object.fromEntries(strings.map((key) => [key, optionalString(raw[key], key, key === "notes" ? 4000 : key === "description" || key === "warrantyTerms" ? 2000 : 200)])) as Record<string, string | null>;
  const dateValues = Object.fromEntries(dates.map((key) => [key, optionalDate(raw[key], key)]));
  const amount = optionalString(raw.amount, "amount", 16);
  if (amount !== null && (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) > 9999999999.99)) throw new AppError(502, "AI service returned an invalid amount.", "AI_INVALID_RESPONSE");
  const currency = optionalString(raw.currency, "currency", 3);
  if (currency !== null && !/^[A-Z]{3}$/.test(currency)) throw new AppError(502, "AI service returned an invalid currency.", "AI_INVALID_RESPONSE");
  const values = { ...suggestion, ...dateValues };
  return {
    extractedText: result.extractedText,
    textSource: result.textSource as AIProcessResponse["textSource"],
    externalProviderUsed: result.externalProviderUsed,
    suggestion: {
      kind: raw.kind as AISuggestion["kind"], category,
      title: values.title ?? null, issuedOn: values.issuedOn ?? null, expiresOn: values.expiresOn ?? null,
      description: values.description ?? null, name: values.name ?? null, purchasedOn: values.purchasedOn ?? null,
      amount, currency, vendor: values.vendor ?? null, notes: values.notes ?? null,
      warrantyProvider: values.warrantyProvider ?? null, warrantyStartsOn: values.warrantyStartsOn ?? null,
      warrantyEndsOn: values.warrantyEndsOn ?? null, warrantyTerms: values.warrantyTerms ?? null,
    },
  };
}
