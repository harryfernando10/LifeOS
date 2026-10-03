import {
  BillingInterval,
  CommitmentStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";

/**
 * Phase 12 financial windows (FR-FIN-01). Inclusive of today through today+N days (UTC).
 * Documented in Context.md.
 */
export const FINANCIAL_WINDOWS_DAYS = [7, 30, 365] as const;

export type FinancialSourceType = "subscription" | "recurring_payment";

export type FinancialOccurrence = {
  /** Stable id: `{sourceType}:{sourceId}:{YYYY-MM-DD}` — one occurrence, no double-count. */
  id: string;
  sourceType: FinancialSourceType;
  sourceId: string;
  title: string;
  detail: string | null;
  amount: string | null;
  currency: string;
  dueOn: string;
  billingInterval: BillingInterval;
  href: string;
  actionUrl: string | null;
};

export type CurrencyTotal = {
  currency: string;
  /** Sum of known amounts only; null-amount occurrences are excluded. */
  total: string;
  occurrenceCount: number;
  countedOccurrenceCount: number;
};

export type FinancialWindow = {
  days: number;
  rangeStart: string;
  rangeEnd: string;
  totalsByCurrency: CurrencyTotal[];
  items: FinancialOccurrence[];
};

export type FinancialCommitmentsResponse = {
  generatedAt: string;
  windows: FinancialWindow[];
  notes: {
    sources: string;
    currency: string;
    nullAmounts: string;
    customInterval: string;
    exclusions: string;
  };
};

type CommitmentRow = {
  id: string;
  name: string;
  amount: Prisma.Decimal | null;
  currency: string;
  billingInterval: BillingInterval;
  nextOn: Date | null;
  actionUrl: string | null;
  party: string | null;
  sourceType: FinancialSourceType;
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

function amountToString(amount: Prisma.Decimal | null): string | null {
  return amount != null ? amount.toFixed(2) : null;
}

/**
 * Advance a date by one billing interval (UTC calendar arithmetic).
 * CUSTOM has no reliable step — callers must not expand CUSTOM.
 */
function addBillingInterval(date: Date, interval: BillingInterval): Date {
  const next = new Date(date);
  switch (interval) {
    case BillingInterval.WEEKLY:
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case BillingInterval.MONTHLY:
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case BillingInterval.QUARTERLY:
      next.setUTCMonth(next.getUTCMonth() + 3);
      break;
    case BillingInterval.YEARLY:
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
    case BillingInterval.CUSTOM:
      throw new Error("CUSTOM billing interval cannot be expanded");
    default: {
      const _exhaustive: never = interval;
      throw new Error(`Unsupported billing interval: ${_exhaustive}`);
    }
  }
  return next;
}

/**
 * Project expected due dates within [windowStart, windowEnd] (inclusive, UTC days).
 *
 * - CUSTOM: at most the single stored next date if it falls in the window.
 * - Known intervals: advance from stored next date; skip past dates before windowStart;
 *   emit every occurrence through windowEnd.
 * - Null next date: no occurrences (cannot project).
 */
export function expandOccurrences(
  nextOn: Date | null,
  interval: BillingInterval,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  if (!nextOn) {
    return [];
  }

  const startMs = windowStart.getTime();
  const endMs = windowEnd.getTime();
  const nextMs = nextOn.getTime();

  if (interval === BillingInterval.CUSTOM) {
    if (nextMs >= startMs && nextMs <= endMs) {
      return [nextOn];
    }
    return [];
  }

  let cursor = nextOn;
  let guard = 0;
  const maxSteps = 400;

  while (cursor.getTime() < startMs && guard < maxSteps) {
    const advanced = addBillingInterval(cursor, interval);
    if (advanced.getTime() <= cursor.getTime()) {
      break;
    }
    cursor = advanced;
    guard += 1;
  }

  const dates: Date[] = [];
  while (cursor.getTime() <= endMs && guard < maxSteps) {
    if (cursor.getTime() >= startMs) {
      dates.push(new Date(cursor));
    }
    const advanced = addBillingInterval(cursor, interval);
    if (advanced.getTime() <= cursor.getTime()) {
      break;
    }
    cursor = advanced;
    guard += 1;
  }

  return dates;
}

function compareOccurrences(
  a: FinancialOccurrence,
  b: FinancialOccurrence,
): number {
  if (a.dueOn !== b.dueOn) {
    return a.dueOn < b.dueOn ? -1 : 1;
  }
  if (a.sourceType !== b.sourceType) {
    return a.sourceType.localeCompare(b.sourceType);
  }
  return a.title.localeCompare(b.title);
}

function buildTotals(items: FinancialOccurrence[]): CurrencyTotal[] {
  const map = new Map<
    string,
    { total: number; occurrenceCount: number; countedOccurrenceCount: number }
  >();

  for (const item of items) {
    const entry = map.get(item.currency) ?? {
      total: 0,
      occurrenceCount: 0,
      countedOccurrenceCount: 0,
    };
    entry.occurrenceCount += 1;
    if (item.amount != null) {
      entry.total += Number(item.amount);
      entry.countedOccurrenceCount += 1;
    }
    map.set(item.currency, entry);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, entry]) => ({
      currency,
      total: entry.total.toFixed(2),
      occurrenceCount: entry.occurrenceCount,
      countedOccurrenceCount: entry.countedOccurrenceCount,
    }));
}

function toOccurrences(
  row: CommitmentRow,
  windowStart: Date,
  windowEnd: Date,
): FinancialOccurrence[] {
  const dates = expandOccurrences(
    row.nextOn,
    row.billingInterval,
    windowStart,
    windowEnd,
  );
  const amount = amountToString(row.amount);
  const label =
    row.sourceType === "subscription" ? "Subscription" : "Recurring payment";

  return dates.map((due) => {
    const dueOn = toDateOnly(due);
    return {
      id: `${row.sourceType}:${row.id}:${dueOn}`,
      sourceType: row.sourceType,
      sourceId: row.id,
      title: row.name,
      detail: [row.party, label, row.billingInterval.toLowerCase()]
        .filter(Boolean)
        .join(" · "),
      amount,
      currency: row.currency,
      dueOn,
      billingInterval: row.billingInterval,
      href: "/app/commitments",
      actionUrl: row.actionUrl,
    };
  });
}

function buildWindow(
  days: number,
  today: Date,
  rows: CommitmentRow[],
): FinancialWindow {
  const rangeStart = today;
  const rangeEnd = addUtcDays(today, days);
  const items: FinancialOccurrence[] = [];

  for (const row of rows) {
    items.push(...toOccurrences(row, rangeStart, rangeEnd));
  }

  items.sort(compareOccurrences);

  return {
    days,
    rangeStart: toDateOnly(rangeStart),
    rangeEnd: toDateOnly(rangeEnd),
    totalsByCurrency: buildTotals(items),
    items,
  };
}

/**
 * Derived financial overview for the authenticated user.
 * Sources: ACTIVE Subscription + ACTIVE RecurringPayment only (no purchases/warranties).
 */
export async function getFinancialCommitmentsForUser(
  userId: string,
  now: Date = new Date(),
): Promise<FinancialCommitmentsResponse> {
  const today = startOfUtcDay(now);

  const [subscriptions, recurringPayments] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        userId,
        status: CommitmentStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        provider: true,
        amount: true,
        currency: true,
        billingInterval: true,
        nextBillingOn: true,
        actionUrl: true,
      },
    }),
    prisma.recurringPayment.findMany({
      where: {
        userId,
        status: CommitmentStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        payee: true,
        amount: true,
        currency: true,
        billingInterval: true,
        nextDueOn: true,
        actionUrl: true,
      },
    }),
  ]);

  const rows: CommitmentRow[] = [
    ...subscriptions.map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      currency: row.currency,
      billingInterval: row.billingInterval,
      nextOn: row.nextBillingOn,
      actionUrl: row.actionUrl,
      party: row.provider,
      sourceType: "subscription" as const,
    })),
    ...recurringPayments.map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      currency: row.currency,
      billingInterval: row.billingInterval,
      nextOn: row.nextDueOn,
      actionUrl: row.actionUrl,
      party: row.payee,
      sourceType: "recurring_payment" as const,
    })),
  ];

  const windows = FINANCIAL_WINDOWS_DAYS.map((days) =>
    buildWindow(days, today, rows),
  );

  return {
    generatedAt: now.toISOString(),
    windows,
    notes: {
      sources:
        "ACTIVE subscriptions and ACTIVE recurring payments only. Purchases and warranties are not recurring financial commitments.",
      currency:
        "Totals are grouped by currency. No exchange-rate conversion is performed.",
      nullAmounts:
        "Occurrences with a null amount appear in lists but are excluded from numeric totals.",
      customInterval:
        "CUSTOM billing intervals contribute at most the single stored next date; no invented schedule.",
      exclusions:
        "PAUSED/CANCELLED commitments and records without a next due/billing date are excluded.",
    },
  };
}
