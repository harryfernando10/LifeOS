import {
  CommitmentStatus,
  DeadlineStatus,
  DocumentStatus,
  RenewalStatus,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";

/** Upcoming attention window when specs do not define a threshold (documented in Context.md). */
export const ACTION_CENTER_UPCOMING_DAYS = 30;

export type ActionUrgency = "overdue" | "upcoming";

export type ActionSourceType =
  | "deadline"
  | "renewal"
  | "document"
  | "subscription"
  | "recurring_payment"
  | "warranty";

export type ActionCenterItem = {
  id: string;
  urgency: ActionUrgency;
  sourceType: ActionSourceType;
  title: string;
  detail: string | null;
  dueOn: string;
  entityType: ActionSourceType;
  entityId: string;
  href: string;
  actionUrl: string | null;
};

export type ActionCenterResponse = {
  generatedAt: string;
  upcomingWindowDays: number;
  items: ActionCenterItem[];
};

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function urgencyFor(dueOn: Date, today: Date): ActionUrgency {
  return dueOn.getTime() < today.getTime() ? "overdue" : "upcoming";
}

function urgencyRank(urgency: ActionUrgency): number {
  return urgency === "overdue" ? 0 : 1;
}

function compareItems(a: ActionCenterItem, b: ActionCenterItem): number {
  const urgencyDiff = urgencyRank(a.urgency) - urgencyRank(b.urgency);
  if (urgencyDiff !== 0) {
    return urgencyDiff;
  }
  if (a.dueOn !== b.dueOn) {
    return a.dueOn < b.dueOn ? -1 : 1;
  }
  return a.title.localeCompare(b.title);
}

export async function getActionCenterForUser(
  userId: string,
  now: Date = new Date(),
): Promise<ActionCenterResponse> {
  const today = startOfUtcDay(now);
  const windowEnd = addUtcDays(today, ACTION_CENTER_UPCOMING_DAYS);

  const [
    deadlines,
    renewals,
    documents,
    subscriptions,
    recurringPayments,
    warranties,
  ] = await Promise.all([
    prisma.deadline.findMany({
      where: {
        userId,
        status: DeadlineStatus.OPEN,
        dueOn: { lte: windowEnd },
      },
      select: {
        id: true,
        title: true,
        dueOn: true,
        actionUrl: true,
        notes: true,
      },
    }),
    prisma.renewal.findMany({
      where: {
        userId,
        status: { in: [RenewalStatus.UPCOMING, RenewalStatus.DUE] },
        dueOn: { lte: windowEnd },
      },
      select: {
        id: true,
        title: true,
        kind: true,
        dueOn: true,
        status: true,
        actionUrl: true,
      },
    }),
    prisma.document.findMany({
      where: {
        userId,
        status: { in: [DocumentStatus.ACTIVE, DocumentStatus.EXPIRED] },
        expiresOn: { not: null, lte: windowEnd },
      },
      select: {
        id: true,
        title: true,
        category: true,
        expiresOn: true,
        status: true,
      },
    }),
    prisma.subscription.findMany({
      where: {
        userId,
        status: CommitmentStatus.ACTIVE,
        nextBillingOn: { not: null, lte: windowEnd },
      },
      select: {
        id: true,
        name: true,
        provider: true,
        nextBillingOn: true,
        actionUrl: true,
        amount: true,
        currency: true,
      },
    }),
    prisma.recurringPayment.findMany({
      where: {
        userId,
        status: CommitmentStatus.ACTIVE,
        nextDueOn: { not: null, lte: windowEnd },
      },
      select: {
        id: true,
        name: true,
        payee: true,
        nextDueOn: true,
        actionUrl: true,
        amount: true,
        currency: true,
      },
    }),
    prisma.warranty.findMany({
      where: {
        userId,
        endsOn: { lte: windowEnd },
      },
      select: {
        id: true,
        endsOn: true,
        provider: true,
        purchase: { select: { id: true, name: true } },
      },
    }),
  ]);

  const items: ActionCenterItem[] = [];

  for (const row of deadlines) {
    const dueOn = toDateOnly(row.dueOn);
    const urgency = urgencyFor(row.dueOn, today);
    items.push({
      id: `deadline:${row.id}`,
      urgency,
      sourceType: "deadline",
      title: row.title,
      detail: urgency === "overdue" ? "Open deadline is overdue" : "Open deadline",
      dueOn,
      entityType: "deadline",
      entityId: row.id,
      href: "/app/renewals",
      actionUrl: row.actionUrl,
    });
  }

  for (const row of renewals) {
    const dueOn = toDateOnly(row.dueOn);
    const urgency = urgencyFor(row.dueOn, today);
    items.push({
      id: `renewal:${row.id}`,
      urgency,
      sourceType: "renewal",
      title: row.title,
      detail: `${row.kind.replaceAll("_", " ").toLowerCase()} · ${row.status.toLowerCase()}`,
      dueOn,
      entityType: "renewal",
      entityId: row.id,
      href: "/app/renewals",
      actionUrl: row.actionUrl,
    });
  }

  for (const row of documents) {
    if (!row.expiresOn) {
      continue;
    }
    const dueOn = toDateOnly(row.expiresOn);
    const urgency = urgencyFor(row.expiresOn, today);
    items.push({
      id: `document:${row.id}`,
      urgency,
      sourceType: "document",
      title: row.title,
      detail:
        urgency === "overdue"
          ? "Document expired"
          : "Document expiring soon",
      dueOn,
      entityType: "document",
      entityId: row.id,
      href: "/app/vault",
      actionUrl: null,
    });
  }

  for (const row of subscriptions) {
    if (!row.nextBillingOn) {
      continue;
    }
    const dueOn = toDateOnly(row.nextBillingOn);
    const urgency = urgencyFor(row.nextBillingOn, today);
    const amount =
      row.amount != null ? `${row.currency} ${row.amount.toFixed(2)}` : null;
    items.push({
      id: `subscription:${row.id}`,
      urgency,
      sourceType: "subscription",
      title: row.name,
      detail: [row.provider, amount, "Subscription billing"]
        .filter(Boolean)
        .join(" · "),
      dueOn,
      entityType: "subscription",
      entityId: row.id,
      href: "/app/commitments",
      actionUrl: row.actionUrl,
    });
  }

  for (const row of recurringPayments) {
    if (!row.nextDueOn) {
      continue;
    }
    const dueOn = toDateOnly(row.nextDueOn);
    const urgency = urgencyFor(row.nextDueOn, today);
    const amount =
      row.amount != null ? `${row.currency} ${row.amount.toFixed(2)}` : null;
    items.push({
      id: `recurring_payment:${row.id}`,
      urgency,
      sourceType: "recurring_payment",
      title: row.name,
      detail: [row.payee, amount, "Recurring payment"]
        .filter(Boolean)
        .join(" · "),
      dueOn,
      entityType: "recurring_payment",
      entityId: row.id,
      href: "/app/commitments",
      actionUrl: row.actionUrl,
    });
  }

  for (const row of warranties) {
    const dueOn = toDateOnly(row.endsOn);
    const urgency = urgencyFor(row.endsOn, today);
    items.push({
      id: `warranty:${row.id}`,
      urgency,
      sourceType: "warranty",
      title: row.purchase.name,
      detail:
        urgency === "overdue"
          ? "Warranty expired"
          : row.provider
            ? `Warranty · ${row.provider}`
            : "Warranty expiring soon",
      dueOn,
      entityType: "warranty",
      entityId: row.id,
      href: "/app/commitments",
      actionUrl: null,
    });
  }

  items.sort(compareItems);

  return {
    generatedAt: now.toISOString(),
    upcomingWindowDays: ACTION_CENTER_UPCOMING_DAYS,
    items,
  };
}
