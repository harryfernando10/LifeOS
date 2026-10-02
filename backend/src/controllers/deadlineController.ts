import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  createDeadlineForUser,
  deleteDeadlineForUser,
  getDeadlineForUser,
  listDeadlinesForUser,
  updateDeadlineForUser,
} from "../services/deadlineService.js";
import {
  parseDeadlineCreate,
  parseDeadlineUpdate,
} from "../validators/renewalDeadlineValidators.js";

function requireUserId(req: Request): string {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return req.authUser.id;
}

export async function listDeadlines(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const deadlines = await listDeadlinesForUser(userId);
    res.status(200).json({ deadlines });
  } catch (error) {
    next(error);
  }
}

export async function getDeadline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const deadline = await getDeadlineForUser(userId, req.params.id);
    res.status(200).json({ deadline });
  } catch (error) {
    next(error);
  }
}

export async function createDeadline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const input = parseDeadlineCreate(req.body);
    const deadline = await createDeadlineForUser(userId, input);
    res.status(201).json({ deadline });
  } catch (error) {
    next(error);
  }
}

export async function updateDeadline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const update = parseDeadlineUpdate(req.body);
    const deadline = await updateDeadlineForUser(
      userId,
      req.params.id,
      update,
    );
    res.status(200).json({ deadline });
  } catch (error) {
    next(error);
  }
}

export async function deleteDeadline(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    await deleteDeadlineForUser(userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
