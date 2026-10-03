import { DocumentStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";

/**
 * Default Timeline window when SRS/SDD leave ranges unfinalized.
 * Past 365 days + next 365 days (inclusive of today). Documented in Context.md.
 *
 * Recurrence expansion (computing future occurrences from billingInterval) is
 * intentionally deferred — Timeline uses stored nextBillingOn / nextDueOn only
 * (one dated occurrence per commitment). Full expansion belongs with Phase 12
 * financial windows if still needed; LifeOS is not a calendar product.
 */
export const TIMELINE_PAST_DAYS = 365;
export const TIMELINE_FUTURE_DAYS = 365;

export type TimelineEventType =
  | "deadline"
  | "renewal"
  | "document"
  | "subscription"
  | "recurring_payment"
  | "warranty";

export type TimelineTemporal = "past" | "today" | "upcoming";

export type TimelineItem = {
  id: string;
  type: TimelineEventType;
  title: string;
  detail: string | null;
  /** Date-only YYYY-MM-DD (UTC); no invented times for @db.Date fields. */
  date: string;
  status: string | null;
  temporal: TimelineTemporal;
  sourceId: string;
  href: string;
  actionUrl: string | null;
};

export type TimelineResponse = {
  generatedAt: string;
  rangeStart: string;
  rangeEnd: string;
  pastDays: number;
  futureDays: number;
  items: TimelineItem[];
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

function temporalFor(eventDate: Date, today: Date): TimelineTemporal {
  const t = eventDate.getTime();
  const todayMs = today.getTime();
  if (t < todayMs) {
    return "past";
  }
  if (t === todayMs) {
    return "today";
  }
  return "upcoming";
}

function compareItems(a: TimelineItem, b: TimelineItem): number {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  if (a.type !== b.type) {
    return a.type.localeCompare(b.type);
  }
  return a.title.localeCompare(b.title);
}

export async function getTimelineForUser(
  userId: string,
  now: Date = new Date(),
): Promise<TimelineResponse> {
  const today = startOfUtcDay(now);
  const rangeStart = addUtcDays(today, -TIMELINE_PAST_DAYS);
  const rangeEnd = addUtcDays(today, TIMELINE_FUTURE_DAYS);

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
        dueOn: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        id: true,
        title: true,
        dueOn: true,
        status: true,
        actionUrl: true,
      },
    }),
    prisma.renewal.findMany({
      where: {
        userId,
        dueOn: { gte: rangeStart, lte: rangeEnd },
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
        expiresOn: { not: null, gte: rangeStart, lte: rangeEnd },
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
        nextBillingOn: { not: null, gte: rangeStart, lte: rangeEnd },
      },
      select: {
        id: true,
        name: true,
        provider: true,
        nextBillingOn: true,
        status: true,
        actionUrl: true,
        amount: true,
        currency: true,
      },
    }),
    prisma.recurringPayment.findMany({
      where: {
        userId,
        nextDueOn: { not: null, gte: rangeStart, lte: rangeEnd },
      },
      select: {
        id: true,
        name: true,
        payee: true,
        nextDueOn: true,
        status: true,
        actionUrl: true,
        amount: true,
        currency: true,
      },
    }),
    prisma.warranty.findMany({
      where: {
        userId,
        endsOn: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        id: true,
        endsOn: true,
        provider: true,
        purchase: { select: { id: true, name: true } },
      },
    }),
  ]);

  const items: TimelineItem[] = [];

  for (const row of deadlines) {
    const date = toDateOnly(row.dueOn);
    items.push({
      id: `deadline:${row.id}`,
      type: "deadline",
      title: row.title,
      detail: "Deadline",
      date,
      status: row.status,
      temporal: temporalFor(row.dueOn, today),
      sourceId: row.id,
      href: "/app/renewals",
      actionUrl: row.actionUrl,
    });
  }

  for (const row of renewals) {
    const date = toDateOnly(row.dueOn);
    items.push({
      id: `renewal:${row.id}`,
      type: "renewal",
      title: row.title,
      detail: `${row.kind.replaceAll("_", " ").toLowerCase()} renewal`,
      date,
      status: row.status,
      temporal: temporalFor(row.dueOn, today),
      sourceId: row.id,
      href: "/app/renewals",
      actionUrl: row.actionUrl,
    });
  }

  for (const row of documents) {
    if (!row.expiresOn) {
      continue;
    }
    const date = toDateOnly(row.expiresOn);
    items.push({
      id: `document:${row.id}`,
      type: "document",
      title: row.title,
      detail: `${row.category.replaceAll("_", " ").toLowerCase()} · expires`,
      date,
      status: row.status,
      temporal: temporalFor(row.expiresOn, today),
      sourceId: row.id,
      href: "/app/vault",
      actionUrl: null,
    });
  }

  for (const row of subscriptions) {
    if (!row.nextBillingOn) {
      continue;
    }
    const date = toDateOnly(row.nextBillingOn);
    const amount =
      row.amount != null ? `${row.currency} ${row.amount.toFixed(2)}` : null;
    items.push({
      id: `subscription:${row.id}`,
      type: "subscription",
      title: row.name,
      detail: [row.provider, amount, "Subscription billing"]
        .filter(Boolean)
        .join(" · "),
      date,
      status: row.status,
      temporal: temporalFor(row.nextBillingOn, today),
      sourceId: row.id,
      href: "/app/commitments",
      actionUrl: row.actionUrl,
    });
  }

  for (const row of recurringPayments) {
    if (!row.nextDueOn) {
      continue;
    }
    const date = toDateOnly(row.nextDueOn);
    const amount =
      row.amount != null ? `${row.currency} ${row.amount.toFixed(2)}` : null;
    items.push({
      id: `recurring_payment:${row.id}`,
      type: "recurring_payment",
      title: row.name,
      detail: [row.payee, amount, "Recurring payment"]
        .filter(Boolean)
        .join(" · "),
      date,
      status: row.status,
      temporal: temporalFor(row.nextDueOn, today),
      sourceId: row.id,
      href: "/app/commitments",
      actionUrl: row.actionUrl,
    });
  }

  for (const row of warranties) {
    const date = toDateOnly(row.endsOn);
    items.push({
      id: `warranty:${row.id}`,
      type: "warranty",
      title: row.purchase.name,
      detail: row.provider
        ? `Warranty ends · ${row.provider}`
        : "Warranty ends",
      date,
      status: null,
      temporal: temporalFor(row.endsOn, today),
      sourceId: row.id,
      href: "/app/commitments",
      actionUrl: null,
    });
  }

  items.sort(compareItems);

  return {
    generatedAt: now.toISOString(),
    rangeStart: toDateOnly(rangeStart),
    rangeEnd: toDateOnly(rangeEnd),
    pastDays: TIMELINE_PAST_DAYS,
    futureDays: TIMELINE_FUTURE_DAYS,
    items,
  };
}
