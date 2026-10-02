import type { Renewal } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import { assertOwnership } from "../utils/ownership.js";
import { writeAuditLog } from "./auditService.js";
import type {
  RenewalCreateInput,
  RenewalUpdateInput,
} from "../validators/renewalDeadlineValidators.js";

export type RenewalResponse = {
  id: string;
  title: string;
  kind: string;
  dueOn: string;
  status: string;
  actionUrl: string | null;
  notes: string | null;
  linkedDocumentId: string | null;
  linkedDocumentTitle: string | null;
  createdAt: string;
  updatedAt: string;
};

type RenewalWithDocument = Renewal & {
  linkedDocument: { id: string; title: string } | null;
};

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toRenewalResponse(row: RenewalWithDocument): RenewalResponse {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    dueOn: toDateOnly(row.dueOn),
    status: row.status,
    actionUrl: row.actionUrl,
    notes: row.notes,
    linkedDocumentId: row.linkedDocumentId,
    linkedDocumentTitle: row.linkedDocument?.title ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const renewalInclude = {
  linkedDocument: { select: { id: true, title: true } },
} as const;

async function assertOwnedLinkedDocument(
  userId: string,
  linkedDocumentId: string | null | undefined,
): Promise<void> {
  if (linkedDocumentId === undefined || linkedDocumentId === null) {
    return;
  }

  const document = await prisma.document.findFirst({
    where: { id: linkedDocumentId, userId },
    select: { id: true },
  });
  if (!document) {
    throw new AppError(
      400,
      "linkedDocumentId must refer to one of your documents.",
      "VALIDATION_ERROR",
    );
  }
}

export async function listRenewalsForUser(
  userId: string,
): Promise<RenewalResponse[]> {
  const rows = await prisma.renewal.findMany({
    where: { userId },
    include: renewalInclude,
    orderBy: [{ status: "asc" }, { dueOn: "asc" }, { title: "asc" }],
  });
  return rows.map(toRenewalResponse);
}

export async function getRenewalForUser(
  userId: string,
  id: string,
): Promise<RenewalResponse> {
  const row = await prisma.renewal.findFirst({
    where: { id, userId },
    include: renewalInclude,
  });
  if (!row) {
    throw new AppError(404, "Renewal not found.", "NOT_FOUND");
  }
  assertOwnership(row.userId, userId);
  return toRenewalResponse(row);
}

export async function createRenewalForUser(
  userId: string,
  input: RenewalCreateInput,
): Promise<RenewalResponse> {
  await assertOwnedLinkedDocument(userId, input.linkedDocumentId);

  const row = await prisma.renewal.create({
    data: {
      userId,
      title: input.title,
      kind: input.kind,
      dueOn: input.dueOn,
      status: input.status,
      actionUrl: input.actionUrl,
      notes: input.notes,
      linkedDocumentId: input.linkedDocumentId,
    },
    include: renewalInclude,
  });

  await writeAuditLog({
    userId,
    action: "RENEWAL_CREATED",
    entityType: "Renewal",
    entityId: row.id,
  });

  return toRenewalResponse(row);
}

export async function updateRenewalForUser(
  userId: string,
  id: string,
  update: RenewalUpdateInput,
): Promise<RenewalResponse> {
  const existing = await prisma.renewal.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Renewal not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  if (update.linkedDocumentId !== undefined) {
    await assertOwnedLinkedDocument(userId, update.linkedDocumentId);
  }

  const row = await prisma.renewal.update({
    where: { id },
    data: {
      ...(update.title !== undefined ? { title: update.title } : {}),
      ...(update.kind !== undefined ? { kind: update.kind } : {}),
      ...(update.dueOn !== undefined ? { dueOn: update.dueOn } : {}),
      ...(update.status !== undefined ? { status: update.status } : {}),
      ...(update.actionUrl !== undefined ? { actionUrl: update.actionUrl } : {}),
      ...(update.notes !== undefined ? { notes: update.notes } : {}),
      ...(update.linkedDocumentId !== undefined
        ? { linkedDocumentId: update.linkedDocumentId }
        : {}),
    },
    include: renewalInclude,
  });

  await writeAuditLog({
    userId,
    action: "RENEWAL_UPDATED",
    entityType: "Renewal",
    entityId: row.id,
  });

  return toRenewalResponse(row);
}

export async function deleteRenewalForUser(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await prisma.renewal.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Renewal not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  await prisma.renewal.delete({ where: { id } });

  await writeAuditLog({
    userId,
    action: "RENEWAL_DELETED",
    entityType: "Renewal",
    entityId: id,
  });
}
