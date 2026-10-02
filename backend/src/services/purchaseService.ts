import type { Purchase, Warranty } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import { assertOwnership } from "../utils/ownership.js";
import { writeAuditLog } from "./auditService.js";
import type {
  PurchaseCreateInput,
  PurchaseUpdateInput,
  WarrantyUpsertInput,
} from "../validators/purchaseValidators.js";

export type WarrantyResponse = {
  id: string;
  purchaseId: string;
  provider: string | null;
  startsOn: string | null;
  endsOn: string;
  terms: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseResponse = {
  id: string;
  name: string;
  purchasedOn: string;
  amount: string | null;
  currency: string;
  vendor: string | null;
  notes: string | null;
  receiptDocumentId: string | null;
  receiptTitle: string | null;
  warranty: WarrantyResponse | null;
  createdAt: string;
  updatedAt: string;
};

type PurchaseWithRelations = Purchase & {
  warranty: Warranty | null;
  receiptDocument: { id: string; title: string } | null;
};

function toDateOnly(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

function toWarrantyResponse(row: Warranty): WarrantyResponse {
  return {
    id: row.id,
    purchaseId: row.purchaseId,
    provider: row.provider,
    startsOn: toDateOnly(row.startsOn),
    endsOn: toDateOnly(row.endsOn)!,
    terms: row.terms,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPurchaseResponse(row: PurchaseWithRelations): PurchaseResponse {
  return {
    id: row.id,
    name: row.name,
    purchasedOn: toDateOnly(row.purchasedOn)!,
    amount: row.amount?.toFixed(2) ?? null,
    currency: row.currency,
    vendor: row.vendor,
    notes: row.notes,
    receiptDocumentId: row.receiptDocumentId,
    receiptTitle: row.receiptDocument?.title ?? null,
    warranty: row.warranty ? toWarrantyResponse(row.warranty) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const purchaseInclude = {
  warranty: true,
  receiptDocument: { select: { id: true, title: true } },
} as const;

async function assertOwnedReceiptDocument(
  userId: string,
  receiptDocumentId: string | null | undefined,
  excludePurchaseId?: string,
): Promise<void> {
  if (receiptDocumentId === undefined || receiptDocumentId === null) {
    return;
  }

  const document = await prisma.document.findFirst({
    where: { id: receiptDocumentId, userId },
    select: { id: true },
  });
  if (!document) {
    throw new AppError(
      400,
      "receiptDocumentId must refer to one of your documents.",
      "VALIDATION_ERROR",
    );
  }

  const conflicting = await prisma.purchase.findFirst({
    where: {
      receiptDocumentId,
      ...(excludePurchaseId ? { id: { not: excludePurchaseId } } : {}),
    },
    select: { id: true },
  });
  if (conflicting) {
    throw new AppError(
      409,
      "That document is already linked as a receipt on another purchase.",
      "CONFLICT",
    );
  }
}

export async function listPurchasesForUser(
  userId: string,
): Promise<PurchaseResponse[]> {
  const rows = await prisma.purchase.findMany({
    where: { userId },
    include: purchaseInclude,
    orderBy: [{ purchasedOn: "desc" }, { name: "asc" }],
  });
  return rows.map(toPurchaseResponse);
}

export async function getPurchaseForUser(
  userId: string,
  id: string,
): Promise<PurchaseResponse> {
  const row = await prisma.purchase.findFirst({
    where: { id, userId },
    include: purchaseInclude,
  });
  if (!row) {
    throw new AppError(404, "Purchase not found.", "NOT_FOUND");
  }
  assertOwnership(row.userId, userId);
  return toPurchaseResponse(row);
}

export async function createPurchaseForUser(
  userId: string,
  input: PurchaseCreateInput,
): Promise<PurchaseResponse> {
  await assertOwnedReceiptDocument(userId, input.receiptDocumentId);

  try {
    const row = await prisma.purchase.create({
      data: {
        userId,
        name: input.name,
        purchasedOn: input.purchasedOn,
        amount: input.amount,
        currency: input.currency,
        vendor: input.vendor,
        notes: input.notes,
        receiptDocumentId: input.receiptDocumentId,
      },
      include: purchaseInclude,
    });

    await writeAuditLog({
      userId,
      action: "PURCHASE_CREATED",
      entityType: "Purchase",
      entityId: row.id,
    });

    return toPurchaseResponse(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "That document is already linked as a receipt on another purchase.",
        "CONFLICT",
      );
    }
    throw error;
  }
}

export async function updatePurchaseForUser(
  userId: string,
  id: string,
  update: PurchaseUpdateInput,
): Promise<PurchaseResponse> {
  const existing = await prisma.purchase.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Purchase not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  if (update.receiptDocumentId !== undefined) {
    await assertOwnedReceiptDocument(userId, update.receiptDocumentId, id);
  }

  try {
    const row = await prisma.purchase.update({
      where: { id },
      data: {
        ...(update.name !== undefined ? { name: update.name } : {}),
        ...(update.purchasedOn !== undefined
          ? { purchasedOn: update.purchasedOn }
          : {}),
        ...(update.amount !== undefined ? { amount: update.amount } : {}),
        ...(update.currency !== undefined ? { currency: update.currency } : {}),
        ...(update.vendor !== undefined ? { vendor: update.vendor } : {}),
        ...(update.notes !== undefined ? { notes: update.notes } : {}),
        ...(update.receiptDocumentId !== undefined
          ? { receiptDocumentId: update.receiptDocumentId }
          : {}),
      },
      include: purchaseInclude,
    });

    await writeAuditLog({
      userId,
      action: "PURCHASE_UPDATED",
      entityType: "Purchase",
      entityId: row.id,
    });

    return toPurchaseResponse(row);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "That document is already linked as a receipt on another purchase.",
        "CONFLICT",
      );
    }
    throw error;
  }
}

export async function deletePurchaseForUser(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await prisma.purchase.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Purchase not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  await prisma.purchase.delete({ where: { id } });

  await writeAuditLog({
    userId,
    action: "PURCHASE_DELETED",
    entityType: "Purchase",
    entityId: id,
  });
}

export async function upsertWarrantyForPurchase(
  userId: string,
  purchaseId: string,
  input: WarrantyUpsertInput,
): Promise<PurchaseResponse> {
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, userId },
    include: { warranty: true },
  });
  if (!purchase) {
    throw new AppError(404, "Purchase not found.", "NOT_FOUND");
  }
  assertOwnership(purchase.userId, userId);

  if (purchase.warranty) {
    await prisma.warranty.update({
      where: { id: purchase.warranty.id },
      data: {
        provider: input.provider,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        terms: input.terms,
        notes: input.notes,
      },
    });

    await writeAuditLog({
      userId,
      action: "WARRANTY_UPDATED",
      entityType: "Warranty",
      entityId: purchase.warranty.id,
    });
  } else {
    const created = await prisma.warranty.create({
      data: {
        userId,
        purchaseId,
        provider: input.provider,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        terms: input.terms,
        notes: input.notes,
      },
    });

    await writeAuditLog({
      userId,
      action: "WARRANTY_CREATED",
      entityType: "Warranty",
      entityId: created.id,
    });
  }

  return getPurchaseForUser(userId, purchaseId);
}

export async function deleteWarrantyForPurchase(
  userId: string,
  purchaseId: string,
): Promise<PurchaseResponse> {
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, userId },
    include: { warranty: true },
  });
  if (!purchase) {
    throw new AppError(404, "Purchase not found.", "NOT_FOUND");
  }
  assertOwnership(purchase.userId, userId);

  if (!purchase.warranty) {
    throw new AppError(404, "Warranty not found.", "NOT_FOUND");
  }

  const warrantyId = purchase.warranty.id;
  await prisma.warranty.delete({ where: { id: warrantyId } });

  await writeAuditLog({
    userId,
    action: "WARRANTY_DELETED",
    entityType: "Warranty",
    entityId: warrantyId,
  });

  return getPurchaseForUser(userId, purchaseId);
}
