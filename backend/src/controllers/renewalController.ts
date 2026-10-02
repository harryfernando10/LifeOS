import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  createRenewalForUser,
  deleteRenewalForUser,
  getRenewalForUser,
  listRenewalsForUser,
  updateRenewalForUser,
} from "../services/renewalService.js";
import {
  parseRenewalCreate,
  parseRenewalUpdate,
} from "../validators/renewalDeadlineValidators.js";

function requireUserId(req: Request): string {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return req.authUser.id;
}

export async function listRenewals(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const renewals = await listRenewalsForUser(userId);
    res.status(200).json({ renewals });
  } catch (error) {
    next(error);
  }
}

export async function getRenewal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const renewal = await getRenewalForUser(userId, req.params.id);
    res.status(200).json({ renewal });
  } catch (error) {
    next(error);
  }
}

export async function createRenewal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const input = parseRenewalCreate(req.body);
    const renewal = await createRenewalForUser(userId, input);
    res.status(201).json({ renewal });
  } catch (error) {
    next(error);
  }
}

export async function updateRenewal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const update = parseRenewalUpdate(req.body);
    const renewal = await updateRenewalForUser(userId, req.params.id, update);
    res.status(200).json({ renewal });
  } catch (error) {
    next(error);
  }
}

export async function deleteRenewal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    await deleteRenewalForUser(userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
