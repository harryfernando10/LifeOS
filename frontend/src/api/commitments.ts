import { apiRequest } from "./client";

export const BILLING_INTERVALS = [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "CUSTOM",
] as const;

export const COMMITMENT_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export type Subscription = {
  id: string;
  name: string;
  provider: string | null;
  amount: string | null;
  currency: string;
  billingInterval: BillingInterval;
  nextBillingOn: string | null;
  status: CommitmentStatus;
  actionUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecurringPayment = {
  id: string;
  name: string;
  payee: string | null;
  amount: string | null;
  currency: string;
  billingInterval: BillingInterval;
  nextDueOn: string | null;
  status: CommitmentStatus;
  actionUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionInput = {
  name: string;
  provider?: string | null;
  amount?: string | null;
  currency?: string;
  billingInterval: BillingInterval;
  nextBillingOn?: string | null;
  status?: CommitmentStatus;
  actionUrl?: string | null;
  notes?: string | null;
};

export type RecurringPaymentInput = {
  name: string;
  payee?: string | null;
  amount?: string | null;
  currency?: string;
  billingInterval: BillingInterval;
  nextDueOn?: string | null;
  status?: CommitmentStatus;
  actionUrl?: string | null;
  notes?: string | null;
};

export async function listSubscriptions(): Promise<Subscription[]> {
  const body = await apiRequest<{ subscriptions: Subscription[] }>(
    "/subscriptions",
  );
  return body.subscriptions;
}

export async function createSubscription(
  input: SubscriptionInput,
): Promise<Subscription> {
  const body = await apiRequest<{ subscription: Subscription }>(
    "/subscriptions",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return body.subscription;
}

export async function updateSubscription(
  id: string,
  input: Partial<SubscriptionInput>,
): Promise<Subscription> {
  const body = await apiRequest<{ subscription: Subscription }>(
    `/subscriptions/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return body.subscription;
}

export async function deleteSubscription(id: string): Promise<void> {
  await apiRequest<void>(`/subscriptions/${id}`, { method: "DELETE" });
}

export async function listRecurringPayments(): Promise<RecurringPayment[]> {
  const body = await apiRequest<{ recurringPayments: RecurringPayment[] }>(
    "/recurring-payments",
  );
  return body.recurringPayments;
}

export async function createRecurringPayment(
  input: RecurringPaymentInput,
): Promise<RecurringPayment> {
  const body = await apiRequest<{ recurringPayment: RecurringPayment }>(
    "/recurring-payments",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return body.recurringPayment;
}

export async function updateRecurringPayment(
  id: string,
  input: Partial<RecurringPaymentInput>,
): Promise<RecurringPayment> {
  const body = await apiRequest<{ recurringPayment: RecurringPayment }>(
    `/recurring-payments/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return body.recurringPayment;
}

export async function deleteRecurringPayment(id: string): Promise<void> {
  await apiRequest<void>(`/recurring-payments/${id}`, { method: "DELETE" });
}

export function formatBillingInterval(interval: BillingInterval): string {
  return interval.charAt(0) + interval.slice(1).toLowerCase();
}

export function formatMoney(
  amount: string | null,
  currency: string,
): string {
  if (amount == null) {
    return "—";
  }
  return `${currency} ${amount}`;
}

export function formatStatusLabel(status: CommitmentStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
