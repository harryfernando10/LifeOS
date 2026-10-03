import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { listNotificationsForUser, markAllNotificationsRead, markNotificationRead } from "../services/notificationService.js";

function userId(req: Request): string {
  if (!req.authUser) throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  return req.authUser.id;
}

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json(await listNotificationsForUser(userId(req))); } catch (error) { next(error); }
}

export async function markNotification(req: Request, res: Response, next: NextFunction) {
  try { await markNotificationRead(userId(req), req.params.id); res.status(204).end(); } catch (error) { next(error); }
}

export async function markAllNotifications(req: Request, res: Response, next: NextFunction) {
  try { await markAllNotificationsRead(userId(req)); res.status(204).end(); } catch (error) { next(error); }
}
