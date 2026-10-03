import { apiRequest } from "./client";

export type FinancialSourceType = "subscription" | "recurring_payment";

export type FinancialOccurrence = {
  id: string;
  sourceType: FinancialSourceType;
  sourceId: string;
  title: string;
  detail: string | null;
  amount: string | null;
  currency: string;
  dueOn: string;
  billingInterval: string;
  href: string;
  actionUrl: string | null;
};

export type CurrencyTotal = {
  currency: string;
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

export type FinancialCommitments = {
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

export async function getFinancialCommitments(): Promise<FinancialCommitments> {
  return apiRequest<FinancialCommitments>("/financial-commitments");
}

export function formatSourceTypeLabel(type: FinancialSourceType): string {
  switch (type) {
    case "subscription":
      return "Subscription";
    case "recurring_payment":
      return "Recurring payment";
    default:
      return type;
  }
}

export function formatMoneyAmount(
  amount: string | null,
  currency: string,
): string {
  if (amount == null) {
    return "Amount unknown";
  }
  return `${currency} ${amount}`;
}

export function formatWindowTotals(totals: CurrencyTotal[]): string {
  if (totals.length === 0) {
    return "No expected amounts";
  }
  return totals
    .map((t) => `${t.currency} ${t.total}`)
    .join(" · ");
}
