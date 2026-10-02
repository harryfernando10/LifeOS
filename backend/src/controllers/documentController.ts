import type { NextFunction, Request, Response } from "express";
import { getMaxUploadBytes } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import {
  createDocumentVersionForUser,
  createDocumentWithUpload,
  deleteDocumentForUser,
  getDocumentFileForDownload,
  getDocumentForUser,
  getDocumentVersionFileForDownload,
  listDocumentVersionsForUser,
  listDocumentsForUser,
  updateDocumentMetadata,
} from "../services/documentService.js";
import {
  parseDocumentCreateMetadata,
  parseDocumentUpdateMetadata,
  parseOptionalText,
} from "../validators/documentValidators.js";

function requireUserId(req: Request): string {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return req.authUser.id;
}

function sendDownload(
  res: Response,
  file: { buffer: Buffer; mimeType: string; originalFileName: string },
): void {
  const safeName = file.originalFileName.replace(/[\r\n"]/g, "_");
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}"`,
  );
  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).send(file.buffer);
}

export async function listDocuments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const documents = await listDocumentsForUser(userId);
    res.status(200).json({ documents });
  } catch (error) {
    next(error);
  }
}

export async function getDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const document = await getDocumentForUser(userId, req.params.id);
    res.status(200).json({ document });
  } catch (error) {
    next(error);
  }
}

export async function createDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const metadata = parseDocumentCreateMetadata(req.body);

    if (!req.file) {
      throw new AppError(400, "file is required.", "VALIDATION_ERROR");
    }

    const document = await createDocumentWithUpload({
      userId,
      metadata,
      file: {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      maxBytes: getMaxUploadBytes(),
    });

    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
}

export async function updateDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const update = parseDocumentUpdateMetadata(req.body);
    const document = await updateDocumentMetadata(userId, req.params.id, update);
    res.status(200).json({ document });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    await deleteDocumentForUser(userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function downloadDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const file = await getDocumentFileForDownload(userId, req.params.id);
    sendDownload(res, file);
  } catch (error) {
    next(error);
  }
}

export async function listDocumentVersions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const versions = await listDocumentVersionsForUser(userId, req.params.id);
    res.status(200).json({ versions });
  } catch (error) {
    next(error);
  }
}

export async function createDocumentVersion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);

    if (!req.file) {
      throw new AppError(400, "file is required.", "VALIDATION_ERROR");
    }

    const notes =
      parseOptionalText(
        (req.body as Record<string, unknown>)?.notes,
        "notes",
        4000,
      ) ?? null;

    const result = await createDocumentVersionForUser({
      userId,
      documentId: req.params.id,
      file: {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      maxBytes: getMaxUploadBytes(),
      notes,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadDocumentVersion(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const file = await getDocumentVersionFileForDownload(
      userId,
      req.params.id,
      req.params.versionId,
    );
    sendDownload(res, file);
  } catch (error) {
    next(error);
  }
}
