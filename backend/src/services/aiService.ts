import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import { getAiServiceToken, getAiServiceUrl } from "../config/env.js";
import { parseAIProcessResponse } from "../validators/aiValidators.js";
import { getFileStorageService } from "./fileStorageService.js";
import { createDocumentWithUpload, updateDocumentMetadata } from "./documentService.js";
import { getInboxFileForDownload, getInboxItemForUser, updateInboxItem } from "./inboxService.js";
import type { DocumentMetadataInput, DocumentMetadataUpdateInput } from "../validators/documentValidators.js";

type PrivateFile = { storageKey: string; mimeType: string };

async function requestSuggestions(file: PrivateFile) {
  const baseUrl = getAiServiceUrl();
  const token = getAiServiceToken();
  if (!baseUrl || !token) throw new AppError(503, "AI processing is unavailable. Configure AI_SERVICE_URL and AI_SERVICE_TOKEN for the optional AI service.", "AI_UNAVAILABLE");
  let serviceAddress: URL;
  try { serviceAddress = new URL(baseUrl); }
  catch { throw new AppError(503, "AI processing is unavailable because AI_SERVICE_URL is invalid.", "AI_UNAVAILABLE"); }
  if (serviceAddress.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(serviceAddress.hostname)) {
    throw new AppError(503, "AI_SERVICE_URL must use HTTPS unless it points to this machine.", "AI_UNAVAILABLE");
  }
  const contents = await getFileStorageService().readFile(file.storageKey);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": file.mimeType },
      body: new Uint8Array(contents),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new AppError(503, "AI processing service is unavailable. Your file was not changed.", "AI_UNAVAILABLE");
  }
  let body: unknown;
  try { body = await response.json(); } catch { throw new AppError(502, "AI processing service returned an invalid response.", "AI_INVALID_RESPONSE"); }
  if (!response.ok) {
    const detail = body && typeof body === "object" ? (body as { detail?: { code?: string; error?: string } }).detail : undefined;
    const code = detail?.code ?? (response.status === 503 ? "AI_UNAVAILABLE" : "AI_PROCESSING_FAILED");
    throw new AppError(response.status >= 500 ? 503 : response.status, detail?.error ?? "AI could not process this file.", code);
  }
  return parseAIProcessResponse(body);
}

export async function analyzeInboxItemForUser(userId: string, id: string) {
  const item = await prisma.inboxItem.findFirst({
    where: { id, userId },
    select: { storageKey: true, mimeType: true, linkedDocument: { select: { userId: true, versions: { where: { isCurrent: true }, take: 1, select: { storageKey: true, mimeType: true } } } } },
  });
  if (!item) throw new AppError(404, "Inbox item not found.", "NOT_FOUND");
  const documentVersion = item.linkedDocument?.userId === userId ? item.linkedDocument.versions[0] : null;
  const file = documentVersion?.storageKey && documentVersion.mimeType
    ? { storageKey: documentVersion.storageKey, mimeType: documentVersion.mimeType }
    : item.storageKey && item.mimeType ? { storageKey: item.storageKey, mimeType: item.mimeType } : null;
  if (!file) throw new AppError(400, "This Inbox item has no supported file to process.", "UNSUPPORTED_FILE");
  return requestSuggestions(file);
}

export async function analyzeDocumentForUser(userId: string, id: string) {
  const document = await prisma.document.findFirst({
    where: { id, userId },
    select: { versions: { where: { isCurrent: true }, take: 1, select: { storageKey: true, mimeType: true } } },
  });
  if (!document) throw new AppError(404, "Document not found.", "NOT_FOUND");
  const version = document.versions[0];
  if (!version?.storageKey || !version.mimeType) throw new AppError(400, "This document has no supported file to process.", "UNSUPPORTED_FILE");
  return requestSuggestions({ storageKey: version.storageKey, mimeType: version.mimeType });
}

export async function confirmInboxDocumentForUser(
  userId: string,
  id: string,
  metadata: DocumentMetadataInput | DocumentMetadataUpdateInput,
  maxBytes: number,
) {
  const inbox = await getInboxItemForUser(userId, id);
  if (inbox.linkedDocumentId) {
    return updateDocumentMetadata(userId, inbox.linkedDocumentId, metadata);
  }
  const file = await getInboxFileForDownload(userId, id);
  const document = await createDocumentWithUpload({
    userId,
    metadata: metadata as DocumentMetadataInput,
    file: { buffer: file.buffer, originalName: file.originalFileName, mimeType: file.mimeType, size: file.buffer.byteLength },
    maxBytes,
  });
  await updateInboxItem(userId, id, { linkedDocumentId: document.id });
  return document;
}
