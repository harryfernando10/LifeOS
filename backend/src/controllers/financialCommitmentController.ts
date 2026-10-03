import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getFinancialCommitmentsForUser } from "../services/financialCommitmentService.js";

function requireUserId(req: Request): string {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return req.authUser.id;
}

export async function getFinancialCommitments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const summary = await getFinancialCommitmentsForUser(userId);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}
