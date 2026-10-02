import type { Deadline } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import { assertOwnership } from "../utils/ownership.js";
import { writeAuditLog } from "./auditService.js";
import type {
  DeadlineCreateInput,
  DeadlineUpdateInput,
} from "../validators/renewalDeadlineValidators.js";

export type DeadlineResponse = {
  id: string;
  title: string;
  dueOn: string;
  status: string;
  actionUrl: string | null;
  notes: string | null;
  linkedDocumentId: string | null;
  linkedDocumentTitle: string | null;
  createdAt: string;
  updatedAt: string;
};

type DeadlineWithDocument = Deadline & {
  linkedDocument: { id: string; title: string } | null;
};

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDeadlineResponse(row: DeadlineWithDocument): DeadlineResponse {
  return {
    id: row.id,
    title: row.title,
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

const deadlineInclude = {
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

export async function listDeadlinesForUser(
  userId: string,
): Promise<DeadlineResponse[]> {
  const rows = await prisma.deadline.findMany({
    where: { userId },
    include: deadlineInclude,
    orderBy: [{ status: "asc" }, { dueOn: "asc" }, { title: "asc" }],
  });
  return rows.map(toDeadlineResponse);
}

export async function getDeadlineForUser(
  userId: string,
  id: string,
): Promise<DeadlineResponse> {
  const row = await prisma.deadline.findFirst({
    where: { id, userId },
    include: deadlineInclude,
  });
  if (!row) {
    throw new AppError(404, "Deadline not found.", "NOT_FOUND");
  }
  assertOwnership(row.userId, userId);
  return toDeadlineResponse(row);
}

export async function createDeadlineForUser(
  userId: string,
  input: DeadlineCreateInput,
): Promise<DeadlineResponse> {
  await assertOwnedLinkedDocument(userId, input.linkedDocumentId);

  const row = await prisma.deadline.create({
    data: {
      userId,
      title: input.title,
      dueOn: input.dueOn,
      status: input.status,
      actionUrl: input.actionUrl,
      notes: input.notes,
      linkedDocumentId: input.linkedDocumentId,
    },
    include: deadlineInclude,
  });

  await writeAuditLog({
    userId,
    action: "DEADLINE_CREATED",
    entityType: "Deadline",
    entityId: row.id,
  });

  return toDeadlineResponse(row);
}

export async function updateDeadlineForUser(
  userId: string,
  id: string,
  update: DeadlineUpdateInput,
): Promise<DeadlineResponse> {
  const existing = await prisma.deadline.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Deadline not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  if (update.linkedDocumentId !== undefined) {
    await assertOwnedLinkedDocument(userId, update.linkedDocumentId);
  }

  const row = await prisma.deadline.update({
    where: { id },
    data: {
      ...(update.title !== undefined ? { title: update.title } : {}),
      ...(update.dueOn !== undefined ? { dueOn: update.dueOn } : {}),
      ...(update.status !== undefined ? { status: update.status } : {}),
      ...(update.actionUrl !== undefined ? { actionUrl: update.actionUrl } : {}),
      ...(update.notes !== undefined ? { notes: update.notes } : {}),
      ...(update.linkedDocumentId !== undefined
        ? { linkedDocumentId: update.linkedDocumentId }
        : {}),
    },
    include: deadlineInclude,
  });

  await writeAuditLog({
    userId,
    action: "DEADLINE_UPDATED",
    entityType: "Deadline",
    entityId: row.id,
  });

  return toDeadlineResponse(row);
}

export async function deleteDeadlineForUser(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await prisma.deadline.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new AppError(404, "Deadline not found.", "NOT_FOUND");
  }
  assertOwnership(existing.userId, userId);

  await prisma.deadline.delete({ where: { id } });

  await writeAuditLog({
    userId,
    action: "DEADLINE_DELETED",
    entityType: "Deadline",
    entityId: id,
  });
}
