import type {
  Document,
  DocumentCategory,
  DocumentStatus,
  DocumentVersion,
  Prisma,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import { assertOwnership } from "../utils/ownership.js";
import {
  assertAllowedClientHints,
  assertDetectedTypeMatchesHints,
  detectAllowedFileType,
  sanitizeOriginalFileName,
} from "../utils/fileValidation.js";
import type {
  DocumentMetadataInput,
  DocumentMetadataUpdateInput,
} from "../validators/documentValidators.js";
import { writeAuditLog } from "./auditService.js";
import { getFileStorageService } from "./fileStorageService.js";

export type DocumentVersionSummary = {
  id: string;
  versionNumber: number;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  isCurrent: boolean;
  uploadedAt: string;
  replacedAt: string | null;
};

export type DocumentResponse = {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string | null;
  status: DocumentStatus;
  issuedOn: string | null;
  expiresOn: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: DocumentVersionSummary | null;
};

function toDateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

function toVersionSummary(version: DocumentVersion): DocumentVersionSummary {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    originalFileName: version.originalFileName,
    mimeType: version.mimeType,
    sizeBytes: version.sizeBytes,
    isCurrent: version.isCurrent,
    uploadedAt: version.uploadedAt.toISOString(),
    replacedAt: version.replacedAt ? version.replacedAt.toISOString() : null,
  };
}

function validateUploadFile(input: {
  buffer: Buffer;
  originalName: string;
  mimeType?: string;
  size: number;
  maxBytes: number;
}): {
  originalFileName: string;
  detected: NonNullable<ReturnType<typeof detectAllowedFileType>>;
} {
  if (input.size <= 0 || input.buffer.byteLength <= 0) {
    throw new AppError(400, "Uploaded file is empty.", "VALIDATION_ERROR");
  }

  if (input.size > input.maxBytes) {
    throw new AppError(
      400,
      `File exceeds the maximum size of ${input.maxBytes} bytes.`,
      "FILE_TOO_LARGE",
    );
  }

  const originalFileName = sanitizeOriginalFileName(input.originalName);
  assertAllowedClientHints(originalFileName, input.mimeType);

  const detected = detectAllowedFileType(input.buffer);
  if (!detected) {
    throw new AppError(
      400,
      "Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP.",
      "UNSUPPORTED_FILE_TYPE",
    );
  }
  assertDetectedTypeMatchesHints(detected, originalFileName);

  return { originalFileName, detected };
}

function toDocumentResponse(
  document: Document & { versions: DocumentVersion[] },
): DocumentResponse {
  const current =
    document.versions.find((version) => version.isCurrent) ??
    document.versions[0] ??
    null;

  return {
    id: document.id,
    title: document.title,
    category: document.category,
    description: document.description,
    status: document.status,
    issuedOn: toDateOnly(document.issuedOn),
    expiresOn: toDateOnly(document.expiresOn),
    notes: document.notes,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    currentVersion: current ? toVersionSummary(current) : null,
  };
}

const documentInclude = {
  versions: {
    where: { isCurrent: true },
    orderBy: { versionNumber: "desc" as const },
    take: 1,
  },
};

export async function listDocumentsForUser(
  userId: string,
): Promise<DocumentResponse[]> {
  const documents = await prisma.document.findMany({
    where: { userId },
    include: documentInclude,
    orderBy: { updatedAt: "desc" },
  });

  return documents.map(toDocumentResponse);
}

export async function getDocumentForUser(
  userId: string,
  documentId: string,
): Promise<DocumentResponse> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    include: documentInclude,
  });

  if (!document) {
    throw new AppError(404, "Document not found.", "NOT_FOUND");
  }

  assertOwnership(document.userId, userId);
  return toDocumentResponse(document);
}

export async function createDocumentWithUpload(input: {
  userId: string;
  metadata: DocumentMetadataInput;
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType?: string;
    size: number;
  };
  maxBytes: number;
}): Promise<DocumentResponse> {
  const { originalFileName, detected } = validateUploadFile({
    buffer: input.file.buffer,
    originalName: input.file.originalName,
    mimeType: input.file.mimeType,
    size: input.file.size,
    maxBytes: input.maxBytes,
  });

  const storage = getFileStorageService();
  const { documentId, versionId } = storage.createIds();
  const storageKey = storage.buildStorageKey(
    input.userId,
    documentId,
    versionId,
  );

  let stored = false;
  try {
    const storedMeta = await storage.storeFile(storageKey, input.file.buffer);
    stored = true;

    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          id: documentId,
          userId: input.userId,
          title: input.metadata.title,
          category: input.metadata.category,
          description: input.metadata.description,
          status: input.metadata.status,
          issuedOn: input.metadata.issuedOn,
          expiresOn: input.metadata.expiresOn,
          notes: input.metadata.notes,
          versions: {
            create: {
              id: versionId,
              versionNumber: 1,
              storageKey,
              originalFileName,
              mimeType: detected.mimeType,
              sizeBytes: storedMeta.sizeBytes,
              checksumSha256: storedMeta.checksumSha256,
              isCurrent: true,
            },
          },
        },
        include: documentInclude,
      });

      await tx.auditLog.create({
        data: {
          userId: input.userId,
          action: "DOCUMENT_CREATED",
          entityType: "Document",
          entityId: created.id,
          metadata: {
            category: created.category,
            mimeType: detected.mimeType,
            sizeBytes: storedMeta.sizeBytes,
          } as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    return toDocumentResponse(document);
  } catch (error) {
    if (stored) {
      try {
        await storage.deleteFile(storageKey);
      } catch {
        // Best-effort cleanup; do not mask the original error.
      }
    }
    throw error;
  }
}

export async function listDocumentVersionsForUser(
  userId: string,
  documentId: string,
): Promise<DocumentVersionSummary[]> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true, userId: true },
  });

  if (!document) {
    throw new AppError(404, "Document not found.", "NOT_FOUND");
  }

  assertOwnership(document.userId, userId);

  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { versionNumber: "desc" },
  });

  return versions.map(toVersionSummary);
}

export async function createDocumentVersionForUser(input: {
  userId: string;
  documentId: string;
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType?: string;
    size: number;
  };
  maxBytes: number;
  notes?: string | null;
}): Promise<{
  document: DocumentResponse;
  version: DocumentVersionSummary;
}> {
  const existing = await prisma.document.findFirst({
    where: { id: input.documentId, userId: input.userId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!existing) {
    throw new AppError(404, "Document not found.", "NOT_FOUND");
  }

  assertOwnership(existing.userId, input.userId);

  const { originalFileName, detected } = validateUploadFile({
    buffer: input.file.buffer,
    originalName: input.file.originalName,
    mimeType: input.file.mimeType,
    size: input.file.size,
    maxBytes: input.maxBytes,
  });

  const nextVersionNumber = (existing.versions[0]?.versionNumber ?? 0) + 1;
  const storage = getFileStorageService();
  const versionId = storage.createIds().versionId;
  const storageKey = storage.buildStorageKey(
    input.userId,
    input.documentId,
    versionId,
  );

  let stored = false;
  try {
    const storedMeta = await storage.storeFile(storageKey, input.file.buffer);
    stored = true;
    const replacedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      await tx.documentVersion.updateMany({
        where: { documentId: input.documentId, isCurrent: true },
        data: {
          isCurrent: false,
          replacedAt,
        },
      });

      const createdVersion = await tx.documentVersion.create({
        data: {
          id: versionId,
          documentId: input.documentId,
          versionNumber: nextVersionNumber,
          storageKey,
          originalFileName,
          mimeType: detected.mimeType,
          sizeBytes: storedMeta.sizeBytes,
          checksumSha256: storedMeta.checksumSha256,
          isCurrent: true,
          notes: input.notes ?? null,
        },
      });

      const document = await tx.document.update({
        where: { id: input.documentId },
        data: { updatedAt: new Date() },
        include: documentInclude,
      });

      await tx.auditLog.create({
        data: {
          userId: input.userId,
          action: "DOCUMENT_VERSION_CREATED",
          entityType: "DocumentVersion",
          entityId: createdVersion.id,
          metadata: {
            documentId: input.documentId,
            versionNumber: createdVersion.versionNumber,
            mimeType: detected.mimeType,
            sizeBytes: storedMeta.sizeBytes,
          } as Prisma.InputJsonValue,
        },
      });

      return { document, version: createdVersion };
    });

    return {
      document: toDocumentResponse(result.document),
      version: toVersionSummary(result.version),
    };
  } catch (error) {
    if (stored) {
      try {
        await storage.deleteFile(storageKey);
      } catch {
        // Best-effort cleanup; do not mask the original error.
      }
    }
    throw error;
  }
}

export async function getDocumentVersionFileForDownload(
  userId: string,
  documentId: string,
  versionId: string,
): Promise<{
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
}> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true, userId: true },
  });

  if (!document) {
    throw new AppError(404, "Document not found.", "NOT_FOUND");
  }

  assertOwnership(document.userId, userId);

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId },
  });

  if (!version?.storageKey || !version.mimeType) {
    throw new AppError(404, "Version not found.", "NOT_FOUND");
  }

  const buffer = await getFileStorageService().readFile(version.storageKey);

  return {
    buffer,
    mimeType: version.mimeType,
    originalFileName: version.originalFileName ?? "document",
  };
}

export async function updateDocumentMetadata(
  userId: string,
  documentId: string,
  update: DocumentMetadataUpdateInput,
): Promise<DocumentResponse> {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });

  if (!existing) {
    throw new AppError(404, "Document not found.", "NOT_FOUND");
  }

  assertOwnership(existing.userId, userId);

  const document = await prisma.document.update({
    where: { id: documentId },
    data: {
      ...(update.title !== undefined ? { title: update.title } : {}),
      ...(update.category !== undefined ? { category: update.category } : {}),
      ...(update.description !== undefined
        ? { description: update.description }
        : {}),
      ...(update.status !== undefined ? { status: update.status } : {}),
      ...(update.issuedOn !== undefined ? { issuedOn: update.issuedOn } : {}),
      ...(update.expiresOn !== undefined ? { expiresOn: update.expiresOn } : {}),
      ...(update.notes !== undefined ? { notes: update.notes } : {}),
    },
    include: documentInclude,
  });

  await writeAuditLog({
    userId,
    action: "DOCUMENT_UPDATED",
    entityType: "Document",
    entityId: document.id,
  });

  return toDocumentResponse(document);
}

export async function deleteDocumentForUser(
  userId: string,
  documentId: string,
): Promise<void> {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, userId },
    include: {
      versions: {
        select: { storageKey: true },
      },
    },
  });

  if (!existing) {
    throw new AppError(404, "Document not found.", "NOT_FOUND");
  }

  assertOwnership(existing.userId, userId);

  await prisma.document.delete({
    where: { id: documentId },
  });

  const storage = getFileStorageService();
  try {
    await storage.deleteDocumentDirectory(userId, documentId);
  } catch {
    for (const version of existing.versions) {
      if (version.storageKey) {
        try {
          await storage.deleteFile(version.storageKey);
        } catch {
          // Best-effort filesystem cleanup after DB delete.
        }
      }
    }
  }

  await writeAuditLog({
    userId,
    action: "DOCUMENT_DELETED",
    entityType: "Document",
    entityId: documentId,
  });
}

export async function getDocumentFileForDownload(
  userId: string,
  documentId: string,
): Promise<{
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
}> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1,
      },
    },
  });

  if (!document) {
    throw new AppError(404, "Document not found.", "NOT_FOUND");
  }

  assertOwnership(document.userId, userId);

  const current = document.versions[0];
  if (!current?.storageKey || !current.mimeType) {
    throw new AppError(404, "File not found.", "NOT_FOUND");
  }

  const buffer = await getFileStorageService().readFile(current.storageKey);

  return {
    buffer,
    mimeType: current.mimeType,
    originalFileName: current.originalFileName ?? "document",
  };
}
