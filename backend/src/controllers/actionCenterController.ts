import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getActionCenterForUser } from "../services/actionCenterService.js";

function requireUserId(req: Request): string {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return req.authUser.id;
}

export async function getActionCenter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const actionCenter = await getActionCenterForUser(userId);
    res.status(200).json(actionCenter);
  } catch (error) {
    next(error);
  }
}
