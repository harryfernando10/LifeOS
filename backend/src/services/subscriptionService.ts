import type { Subscription } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import { assertOwnership } from "../utils/ownership.js";
import { writeAuditLog } from "./auditService.js";
import type {
  SubscriptionCreateInput,
  SubscriptionUpdateInput,
} from "../validators/commitmentValidators.js";

export type SubscriptionResponse = {
  id: string;
  name: string;
  provider: string | null;
  amount: string | null;
  currency: string;
  billingInterval: string;
  nextBillingOn: string | null;
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

function toSubscriptionResponse(row: Subscription): SubscriptionResponse {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    amount: row.amount?.toFixed(2) ?? null,
    currency: row.currency,
    billingInterval: row.billingInterval,
    nextBillingOn: toDateOnly(row.nextBillingOn),
    status: row.status,
    actionUrl: row.actionUrl,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSubscriptionsForUser(
  userId: string,
): Promise<SubscriptionResponse[]> {
  const rows = await prisma.subscription.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { nextBillingOn: "asc" }, { name: "asc" }],
  });
  return rows.map(toSubscriptionResponse);
}

export async function getSubscriptionForUser(
  userId: string,
  id: string,
): Promise<SubscriptionResponse> {
  const row = await prisma.subscription.findFirst({
    where: { id, userId },
  });
  if (!row) {
    throw new AppError(404, "Subscription not found.", "NOT_FOUND");
  }
  assertOwnership(row.userId, userId);
  return toSubscriptionResponse(row);
}

export async function createSubscriptionForUser(
  userId: string,
  input: SubscriptionCreateInput,
): Promise<SubscriptionResponse> {
  const row = await prisma.subscription.create({
    data: {
      userId,
      name: input.name,
      provider: input.provider,
      amount: input.amount,
      currency: input.currency,
      billingInterval: input.billingInterval,
      nextBillingOn: input.nextBillingOn,
      status: input.status,
      actionUrl: input.actionUrl,
      notes: input.notes,
    },
  });

  await writeAuditLog({
    userId,
    action: "SUBSCRIPTION_CREATED",
    entityType: "Subscription",
    entityId: row.id,
  });

  return toSubscriptionResponse(row);
}

export async function updateSubscriptionForUser(
  userId: string,
  id: string,
  update: SubscriptionUpdateInput,
): Promise<SubscriptionResponse> {
  const existing = await prisma.subscription.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Subscription not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  const row = await prisma.subscription.update({
    where: { id },
    data: {
      ...(update.name !== undefined ? { name: update.name } : {}),
      ...(update.provider !== undefined ? { provider: update.provider } : {}),
      ...(update.amount !== undefined ? { amount: update.amount } : {}),
      ...(update.currency !== undefined ? { currency: update.currency } : {}),
      ...(update.billingInterval !== undefined
        ? { billingInterval: update.billingInterval }
        : {}),
      ...(update.nextBillingOn !== undefined
        ? { nextBillingOn: update.nextBillingOn }
        : {}),
      ...(update.status !== undefined ? { status: update.status } : {}),
      ...(update.actionUrl !== undefined ? { actionUrl: update.actionUrl } : {}),
      ...(update.notes !== undefined ? { notes: update.notes } : {}),
    },
  });

  await writeAuditLog({
    userId,
    action: "SUBSCRIPTION_UPDATED",
    entityType: "Subscription",
    entityId: row.id,
  });

  return toSubscriptionResponse(row);
}

export async function deleteSubscriptionForUser(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await prisma.subscription.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Subscription not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  await prisma.subscription.delete({ where: { id } });

  await writeAuditLog({
    userId,
    action: "SUBSCRIPTION_DELETED",
    entityType: "Subscription",
    entityId: id,
  });
}
