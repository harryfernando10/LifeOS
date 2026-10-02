import type { RecurringPayment } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import { assertOwnership } from "../utils/ownership.js";
import { writeAuditLog } from "./auditService.js";
import type {
  RecurringPaymentCreateInput,
  RecurringPaymentUpdateInput,
} from "../validators/commitmentValidators.js";

export type RecurringPaymentResponse = {
  id: string;
  name: string;
  payee: string | null;
  amount: string | null;
  currency: string;
  billingInterval: string;
  nextDueOn: string | null;
  status: string;
  actionUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

function toRecurringPaymentResponse(
  row: RecurringPayment,
): RecurringPaymentResponse {
  return {
    id: row.id,
    name: row.name,
    payee: row.payee,
    amount: row.amount?.toFixed(2) ?? null,
    currency: row.currency,
    billingInterval: row.billingInterval,
    nextDueOn: toDateOnly(row.nextDueOn),
    status: row.status,
    actionUrl: row.actionUrl,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listRecurringPaymentsForUser(
  userId: string,
): Promise<RecurringPaymentResponse[]> {
  const rows = await prisma.recurringPayment.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { nextDueOn: "asc" }, { name: "asc" }],
  });
  return rows.map(toRecurringPaymentResponse);
}

export async function getRecurringPaymentForUser(
  userId: string,
  id: string,
): Promise<RecurringPaymentResponse> {
  const row = await prisma.recurringPayment.findFirst({
    where: { id, userId },
  });
  if (!row) {
    throw new AppError(404, "Recurring payment not found.", "NOT_FOUND");
  }
  assertOwnership(row.userId, userId);
  return toRecurringPaymentResponse(row);
}

export async function createRecurringPaymentForUser(
  userId: string,
  input: RecurringPaymentCreateInput,
): Promise<RecurringPaymentResponse> {
  const row = await prisma.recurringPayment.create({
    data: {
      userId,
      name: input.name,
      payee: input.payee,
      amount: input.amount,
      currency: input.currency,
      billingInterval: input.billingInterval,
      nextDueOn: input.nextDueOn,
      status: input.status,
      actionUrl: input.actionUrl,
      notes: input.notes,
    },
  });

  await writeAuditLog({
    userId,
    action: "RECURRING_PAYMENT_CREATED",
    entityType: "RecurringPayment",
    entityId: row.id,
  });

  return toRecurringPaymentResponse(row);
}

export async function updateRecurringPaymentForUser(
  userId: string,
  id: string,
  update: RecurringPaymentUpdateInput,
): Promise<RecurringPaymentResponse> {
  const existing = await prisma.recurringPayment.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Recurring payment not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  const row = await prisma.recurringPayment.update({
    where: { id },
    data: {
      ...(update.name !== undefined ? { name: update.name } : {}),
      ...(update.payee !== undefined ? { payee: update.payee } : {}),
      ...(update.amount !== undefined ? { amount: update.amount } : {}),
      ...(update.currency !== undefined ? { currency: update.currency } : {}),
      ...(update.billingInterval !== undefined
        ? { billingInterval: update.billingInterval }
        : {}),
      ...(update.nextDueOn !== undefined ? { nextDueOn: update.nextDueOn } : {}),
      ...(update.status !== undefined ? { status: update.status } : {}),
      ...(update.actionUrl !== undefined ? { actionUrl: update.actionUrl } : {}),
      ...(update.notes !== undefined ? { notes: update.notes } : {}),
    },
  });

  await writeAuditLog({
    userId,
    action: "RECURRING_PAYMENT_UPDATED",
    entityType: "RecurringPayment",
    entityId: row.id,
  });

  return toRecurringPaymentResponse(row);
}

export async function deleteRecurringPaymentForUser(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await prisma.recurringPayment.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Recurring payment not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  await prisma.recurringPayment.delete({ where: { id } });

  await writeAuditLog({
    userId,
    action: "RECURRING_PAYMENT_DELETED",
    entityType: "RecurringPayment",
    entityId: id,
  });
}
