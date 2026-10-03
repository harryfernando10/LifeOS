import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getTimelineForUser } from "../services/timelineService.js";

function requireUserId(req: Request): string {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return req.authUser.id;
}

export async function getTimeline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const timeline = await getTimelineForUser(userId);
    res.status(200).json(timeline);
  } catch (error) {
    next(error);
  }
}
