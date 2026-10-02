import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  createSubscriptionForUser,
  deleteSubscriptionForUser,
  getSubscriptionForUser,
  listSubscriptionsForUser,
  updateSubscriptionForUser,
} from "../services/subscriptionService.js";
import {
  parseSubscriptionCreate,
  parseSubscriptionUpdate,
} from "../validators/commitmentValidators.js";

function requireUserId(req: Request): string {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return req.authUser.id;
}

export async function listSubscriptions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const subscriptions = await listSubscriptionsForUser(userId);
    res.status(200).json({ subscriptions });
  } catch (error) {
    next(error);
  }
}

export async function getSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const subscription = await getSubscriptionForUser(userId, req.params.id);
    res.status(200).json({ subscription });
  } catch (error) {
    next(error);
  }
}

export async function createSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const input = parseSubscriptionCreate(req.body);
    const subscription = await createSubscriptionForUser(userId, input);
    res.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
}

export async function updateSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const update = parseSubscriptionUpdate(req.body);
    const subscription = await updateSubscriptionForUser(
      userId,
      req.params.id,
      update,
    );
    res.status(200).json({ subscription });
  } catch (error) {
    next(error);
  }
}

export async function deleteSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    await deleteSubscriptionForUser(userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
