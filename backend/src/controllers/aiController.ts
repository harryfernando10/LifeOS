import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { analyzeDocumentForUser, analyzeInboxItemForUser } from "../services/aiService.js";
import { confirmInboxDocumentForUser } from "../services/aiService.js";
import { getMaxUploadBytes } from "../config/env.js";
import { parseDocumentCreateMetadata, parseDocumentUpdateMetadata } from "../validators/documentValidators.js";
import { getInboxItemForUser } from "../services/inboxService.js";

function userId(req: Request): string {
  if (!req.authUser) throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  return req.authUser.id;
}

export async function analyzeInbox(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json({ result: await analyzeInboxItemForUser(userId(req), req.params.id) }); }
  catch (error) { next(error); }
}

export async function analyzeDocument(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json({ result: await analyzeDocumentForUser(userId(req), req.params.id) }); }
  catch (error) { next(error); }
}

export async function confirmInboxDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const uid = userId(req);
    const existing = await getInboxItemForUser(uid, req.params.id);
    const metadata = existing.linkedDocumentId
      ? parseDocumentUpdateMetadata(req.body)
      : parseDocumentCreateMetadata(req.body);
    const document = await confirmInboxDocumentForUser(uid, req.params.id, metadata, getMaxUploadBytes());
    res.status(201).json({ document });
  } catch (error) { next(error); }
}
