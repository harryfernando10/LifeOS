import type { InboxItemStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import { writeAuditLog } from "./auditService.js";
import { getFileStorageService } from "./fileStorageService.js";
import { assertAllowedClientHints, assertDetectedTypeMatchesHints, detectAllowedFileType, sanitizeOriginalFileName } from "../utils/fileValidation.js";

const include = { linkedDocument: { select: { id: true, title: true } } } as const;
function safeItem<T extends { storageKey: string | null }>(item: T) { const { storageKey: _storageKey, ...response } = item; return response; }

async function verifyDocument(userId: string, id: string | null | undefined) {
  if (id === undefined || id === null) return;
  const document = await prisma.document.findFirst({ where: { id, userId }, select: { id: true } });
  if (!document) throw new AppError(400, "linkedDocumentId must identify one of your Vault documents.", "VALIDATION_ERROR");
}

export async function listInboxForUser(userId: string, status?: InboxItemStatus) {
  const items = await prisma.inboxItem.findMany({ where: { userId, ...(status ? { status } : {}) }, include, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] });
  return items.map(safeItem);
}

export async function getInboxItemForUser(userId: string, id: string) {
  const item = await prisma.inboxItem.findFirst({ where: { id, userId }, include });
  if (!item) throw new AppError(404, "Inbox item not found.", "NOT_FOUND");
  return safeItem(item);
}

export async function createInboxItem(userId: string, input: { title: string; notes: string | null; linkedDocumentId: string | null; file?: { buffer: Buffer; originalName: string; mimeType?: string; size: number; maxBytes: number } }) {
  await verifyDocument(userId, input.linkedDocumentId);
  let fileData: { storageKey: string; originalFileName: string; mimeType: string; sizeBytes: number } | undefined;
  const storage = input.file ? getFileStorageService() : null;
  const itemId = input.file ? randomUUID() : undefined;
  if (input.file && storage && itemId) {
    if (input.file.size <= 0 || input.file.buffer.length <= 0 || input.file.size > input.file.maxBytes) throw new AppError(400, "File is empty or exceeds the upload limit.", "FILE_TOO_LARGE");
    const originalFileName = sanitizeOriginalFileName(input.file.originalName);
    assertAllowedClientHints(originalFileName, input.file.mimeType);
    const detected = detectAllowedFileType(input.file.buffer);
    if (!detected) throw new AppError(400, "Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP.", "UNSUPPORTED_FILE_TYPE");
    assertDetectedTypeMatchesHints(detected, originalFileName);
    const storageKey = `${userId}/inbox/${itemId}`;
    await storage.storeFile(storageKey, input.file.buffer);
    fileData = { storageKey, originalFileName, mimeType: detected.mimeType, sizeBytes: input.file.buffer.length };
  }
  let item;
  try {
    item = await prisma.inboxItem.create({ data: { id: itemId, title: input.title || fileData?.originalFileName, notes: input.notes, linkedDocumentId: input.linkedDocumentId, userId, ...fileData }, include });
  } catch (error) {
    if (fileData && storage) await storage.deleteFile(fileData.storageKey);
    throw error;
  }
  await writeAuditLog({ userId, action: "INBOX_ITEM_CREATED", entityType: "InboxItem", entityId: item.id });
  return safeItem(item);
}

export async function updateInboxItem(userId: string, id: string, input: { title?: string | null; notes?: string | null; linkedDocumentId?: string | null; status?: InboxItemStatus }) {
  await verifyDocument(userId, input.linkedDocumentId);
  const owned = await prisma.inboxItem.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new AppError(404, "Inbox item not found.", "NOT_FOUND");
  const item = await prisma.inboxItem.update({ where: { id }, data: input, include });
  await writeAuditLog({ userId, action: input.status ? "INBOX_ITEM_TRIAGED" : "INBOX_ITEM_UPDATED", entityType: "InboxItem", entityId: item.id, metadata: input.status ? { status: input.status } : undefined });
  return safeItem(item);
}

export async function deleteInboxItem(userId: string, id: string) {
  const owned = await prisma.inboxItem.findFirst({ where: { id, userId }, select: { id: true, storageKey: true } });
  if (!owned) throw new AppError(404, "Inbox item not found.", "NOT_FOUND");
  await prisma.inboxItem.delete({ where: { id } });
  if (owned.storageKey) await getFileStorageService().deleteFile(owned.storageKey);
  await writeAuditLog({ userId, action: "INBOX_ITEM_DELETED", entityType: "InboxItem", entityId: id });
}

export async function getInboxFileForDownload(userId: string, id: string) {
  const item = await prisma.inboxItem.findFirst({ where: { id, userId }, select: { storageKey: true, originalFileName: true, mimeType: true } });
  if (!item) throw new AppError(404, "Inbox item not found.", "NOT_FOUND");
  if (!item.storageKey || !item.originalFileName || !item.mimeType) throw new AppError(404, "Inbox item has no attached file.", "NOT_FOUND");
  return { buffer: await getFileStorageService().readFile(item.storageKey), originalFileName: item.originalFileName, mimeType: item.mimeType };
}
