import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import {
  createRecurringPaymentForUser,
  deleteRecurringPaymentForUser,
  getRecurringPaymentForUser,
  listRecurringPaymentsForUser,
  updateRecurringPaymentForUser,
} from "../services/recurringPaymentService.js";
import {
  parseRecurringPaymentCreate,
  parseRecurringPaymentUpdate,
} from "../validators/commitmentValidators.js";

function requireUserId(req: Request): string {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return req.authUser.id;
}

export async function listRecurringPayments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const recurringPayments = await listRecurringPaymentsForUser(userId);
    res.status(200).json({ recurringPayments });
  } catch (error) {
    next(error);
  }
}

export async function getRecurringPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const recurringPayment = await getRecurringPaymentForUser(
      userId,
      req.params.id,
    );
    res.status(200).json({ recurringPayment });
  } catch (error) {
    next(error);
  }
}

export async function createRecurringPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const input = parseRecurringPaymentCreate(req.body);
    const recurringPayment = await createRecurringPaymentForUser(userId, input);
    res.status(201).json({ recurringPayment });
  } catch (error) {
    next(error);
  }
}

export async function updateRecurringPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const update = parseRecurringPaymentUpdate(req.body);
    const recurringPayment = await updateRecurringPaymentForUser(
      userId,
      req.params.id,
      update,
    );
    res.status(200).json({ recurringPayment });
  } catch (error) {
    next(error);
  }
}

export async function deleteRecurringPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    await deleteRecurringPaymentForUser(userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
