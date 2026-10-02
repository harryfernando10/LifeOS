import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  createPurchaseForUser,
  deletePurchaseForUser,
  deleteWarrantyForPurchase,
  getPurchaseForUser,
  listPurchasesForUser,
  updatePurchaseForUser,
  upsertWarrantyForPurchase,
} from "../services/purchaseService.js";
import {
  parsePurchaseCreate,
  parsePurchaseUpdate,
  parseWarrantyUpsert,
} from "../validators/purchaseValidators.js";

function requireUserId(req: Request): string {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return req.authUser.id;
}

export async function listPurchases(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const purchases = await listPurchasesForUser(userId);
    res.status(200).json({ purchases });
  } catch (error) {
    next(error);
  }
}

export async function getPurchase(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const purchase = await getPurchaseForUser(userId, req.params.id);
    res.status(200).json({ purchase });
  } catch (error) {
    next(error);
  }
}

export async function createPurchase(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const input = parsePurchaseCreate(req.body);
    const purchase = await createPurchaseForUser(userId, input);
    res.status(201).json({ purchase });
  } catch (error) {
    next(error);
  }
}

export async function updatePurchase(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const update = parsePurchaseUpdate(req.body);
    const purchase = await updatePurchaseForUser(
      userId,
      req.params.id,
      update,
    );
    res.status(200).json({ purchase });
  } catch (error) {
    next(error);
  }
}

export async function deletePurchase(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    await deletePurchaseForUser(userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function upsertWarranty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const input = parseWarrantyUpsert(req.body);
    const purchase = await upsertWarrantyForPurchase(
      userId,
      req.params.id,
      input,
    );
    res.status(200).json({ purchase });
  } catch (error) {
    next(error);
  }
}

export async function deleteWarranty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const purchase = await deleteWarrantyForPurchase(userId, req.params.id);
    res.status(200).json({ purchase });
  } catch (error) {
    next(error);
  }
}
