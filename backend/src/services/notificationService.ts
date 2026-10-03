import { NotificationType, type Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/AppError.js";
import { getActionCenterForUser } from "./actionCenterService.js";

const types: Record<string, NotificationType> = {
  deadline: NotificationType.DEADLINE,
  renewal: NotificationType.RENEWAL,
  document: NotificationType.DOCUMENT_EXPIRY,
  subscription: NotificationType.SUBSCRIPTION,
  recurring_payment: NotificationType.RECURRING_PAYMENT,
  warranty: NotificationType.WARRANTY,
};

const hrefs: Record<string, string> = {
  deadline: "/app/renewals?tab=deadlines",
  renewal: "/app/renewals?tab=renewals",
  document: "/app/vault",
  subscription: "/app/commitments",
  recurring_payment: "/app/commitments?tab=payments",
  warranty: "/app/commitments?tab=purchases",
};

/** Materialize Action Center rows in the existing Notification table, once per source/date. */
export async function listNotificationsForUser(userId: string) {
  const actionCenter = await getActionCenterForUser(userId);
  const today = actionCenter.generatedAt.slice(0, 10);
  const rows: Prisma.NotificationCreateManyInput[] = actionCenter.items.map((item) => ({
    userId,
    type: types[item.sourceType],
    title: item.title,
    body: `${item.urgency === "overdue" ? "Overdue" : item.dueOn === today ? "Due today" : "Upcoming"} · ${item.dueOn}${item.detail ? ` · ${item.detail}` : ""}`,
    relatedEntityType: item.sourceType,
    relatedEntityId: item.entityId,
    sourceDueOn: new Date(`${item.dueOn}T00:00:00.000Z`),
  }));

  if (rows.length) {
    await prisma.notification.createMany({ data: rows, skipDuplicates: true });
    await Promise.all(rows.map(row => prisma.notification.updateMany({
      where: { userId, relatedEntityType: row.relatedEntityType, relatedEntityId: row.relatedEntityId, sourceDueOn: row.sourceDueOn },
      data: { title: row.title, body: row.body, dismissedAt: null },
    })));
  }

  const activeKeys = new Set(actionCenter.items.map(item => `${item.sourceType}:${item.entityId}:${item.dueOn}`));
  const generated = await prisma.notification.findMany({ where: { userId, type: { in: Object.values(types) }, dismissedAt: null }, select: { id: true, relatedEntityType: true, relatedEntityId: true, sourceDueOn: true } });
  const staleIds = generated.filter(item => !activeKeys.has(`${item.relatedEntityType}:${item.relatedEntityId}:${item.sourceDueOn?.toISOString().slice(0, 10) ?? ""}`)).map(item => item.id);
  if (staleIds.length) await prisma.notification.deleteMany({ where: { userId, id: { in: staleIds } } });

  const [items, unreadCount] = await Promise.all([prisma.notification.findMany({
    where: { userId, dismissedAt: null },
    orderBy: [{ sourceDueOn: "asc" }, { createdAt: "desc" }],
    take: 100,
  }), prisma.notification.count({ where: { userId, dismissedAt: null, readAt: null } })]);
  return {
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      relatedEntityType: item.relatedEntityType,
      relatedEntityId: item.relatedEntityId,
      dueOn: item.sourceDueOn?.toISOString().slice(0, 10) ?? null,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      href: hrefs[item.relatedEntityType ?? ""] ?? "/app/home",
    })),
    unreadCount,
  };
}

export async function markNotificationRead(userId: string, id: string) {
  const result = await prisma.notification.updateMany({ where: { id, userId, dismissedAt: null, readAt: null }, data: { readAt: new Date() } });
  if (!result.count) {
    const exists = await prisma.notification.findFirst({ where: { id, userId, dismissedAt: null }, select: { id: true } });
    if (!exists) throw new AppError(404, "Notification not found.", "NOT_FOUND");
  }
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null, dismissedAt: null }, data: { readAt: new Date() } });
}
