import { apiRequest } from "./client";

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

export type AIProcessResult = {
  extractedText: string;
  textSource: "pdf-text" | "ocr";
  externalProviderUsed: boolean;
  suggestion: AISuggestion;
};

export async function processInboxWithAI(id: string): Promise<AIProcessResult> {
  const body = await apiRequest<{ result: AIProcessResult }>(`/ai/inbox/${id}/process`, { method: "POST" });
  return body.result;
}

export async function processDocumentWithAI(id: string): Promise<AIProcessResult> {
  const body = await apiRequest<{ result: AIProcessResult }>(`/ai/documents/${id}/process`, { method: "POST" });
  return body.result;
}

export async function confirmInboxDocument(id: string, input: {
  title: string;
  category: string;
  description: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  notes: string | null;
}) {
  const body = await apiRequest<{ document: { id: string } }>(`/ai/inbox/${id}/confirm-document`, { method: "POST", body: JSON.stringify(input) });
  return body.document;
}
