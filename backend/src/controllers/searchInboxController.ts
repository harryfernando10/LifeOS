import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getMaxUploadBytes } from "../config/env.js";
import { deleteInboxItem, getInboxFileForDownload, getInboxItemForUser, listInboxForUser, createInboxItem, updateInboxItem } from "../services/inboxService.js";
import { searchForUser } from "../services/searchService.js";
import { parseInboxCreate, parseInboxStatus, parseInboxUpdate, parseSearchQuery } from "../validators/searchInboxValidators.js";

function userId(req: Request) { if (!req.authUser) throw new AppError(401, "Authentication required.", "UNAUTHENTICATED"); return req.authUser.id; }
export async function search(req: Request, res: Response, next: NextFunction) { try { res.json(await searchForUser(userId(req), parseSearchQuery(req.query.q))); } catch (e) { next(e); } }
export async function listInbox(req: Request, res: Response, next: NextFunction) { try { const status = req.query.status === undefined ? undefined : parseInboxStatus(req.query.status); res.json({ items: await listInboxForUser(userId(req), status) }); } catch (e) { next(e); } }
export async function getInbox(req: Request, res: Response, next: NextFunction) { try { res.json({ item: await getInboxItemForUser(userId(req), req.params.id) }); } catch (e) { next(e); } }
export async function createInbox(req: Request, res: Response, next: NextFunction) { try { const file = req.file; const metadata = parseInboxCreate(req.body, file?.originalname); const item = await createInboxItem(userId(req), { ...metadata, ...(file ? { file: { buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype, size: file.size, maxBytes: getMaxUploadBytes() } } : {}) }); res.status(201).json({ item }); } catch (e) { next(e); } }
export async function updateInbox(req: Request, res: Response, next: NextFunction) { try { res.json({ item: await updateInboxItem(userId(req), req.params.id, parseInboxUpdate(req.body)) }); } catch (e) { next(e); } }
export async function triageInbox(req: Request, res: Response, next: NextFunction) { try { const status = parseInboxStatus((req.body as Record<string, unknown> | null)?.status); res.json({ item: await updateInboxItem(userId(req), req.params.id, { status }) }); } catch (e) { next(e); } }
export async function removeInbox(req: Request, res: Response, next: NextFunction) { try { await deleteInboxItem(userId(req), req.params.id); res.status(204).send(); } catch (e) { next(e); } }
export async function downloadInboxFile(req: Request, res: Response, next: NextFunction) { try { const file = await getInboxFileForDownload(userId(req), req.params.id); res.setHeader("Content-Type", file.mimeType); res.setHeader("Content-Disposition", `attachment; filename="${file.originalFileName.replace(/[\r\n"]/g, "_")}"`); res.setHeader("Cache-Control", "private, no-store"); res.status(200).send(file.buffer); } catch (e) { next(e); } }
