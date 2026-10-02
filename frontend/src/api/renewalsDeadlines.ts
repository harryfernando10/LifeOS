import { apiRequest } from "./client";

export const RENEWAL_KINDS = [
  "PASSPORT",
  "DRIVING_LICENCE",
  "INSURANCE",
  "DOMAIN",
  "CERTIFICATION",
  "MEMBERSHIP",
  "LICENCE",
  "OTHER",
] as const;

export const RENEWAL_STATUSES = [
  "UPCOMING",
  "DUE",
  "COMPLETED",
  "CANCELLED",
] as const;

export const DEADLINE_STATUSES = ["OPEN", "COMPLETED", "CANCELLED"] as const;

export type RenewalKind = (typeof RENEWAL_KINDS)[number];
export type RenewalStatus = (typeof RENEWAL_STATUSES)[number];
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];

export type Renewal = {
  id: string;
  title: string;
  kind: RenewalKind;
  dueOn: string;
  status: RenewalStatus;
  actionUrl: string | null;
  notes: string | null;
  linkedDocumentId: string | null;
  linkedDocumentTitle: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Deadline = {
  id: string;
  title: string;
  dueOn: string;
  status: DeadlineStatus;
  actionUrl: string | null;
  notes: string | null;
  linkedDocumentId: string | null;
  linkedDocumentTitle: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RenewalInput = {
  title: string;
  kind?: RenewalKind;
  dueOn: string;
  status?: RenewalStatus;
  actionUrl?: string | null;
  notes?: string | null;
  linkedDocumentId?: string | null;
};

export type DeadlineInput = {
  title: string;
  dueOn: string;
  status?: DeadlineStatus;
  actionUrl?: string | null;
  notes?: string | null;
  linkedDocumentId?: string | null;
};

export async function listRenewals(): Promise<Renewal[]> {
  const body = await apiRequest<{ renewals: Renewal[] }>("/renewals");
  return body.renewals;
}

export async function createRenewal(input: RenewalInput): Promise<Renewal> {
  const body = await apiRequest<{ renewal: Renewal }>("/renewals", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.renewal;
}

export async function updateRenewal(
  id: string,
  input: Partial<RenewalInput>,
): Promise<Renewal> {
  const body = await apiRequest<{ renewal: Renewal }>(`/renewals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return body.renewal;
}

export async function deleteRenewal(id: string): Promise<void> {
  await apiRequest<void>(`/renewals/${id}`, { method: "DELETE" });
}

export async function listDeadlines(): Promise<Deadline[]> {
  const body = await apiRequest<{ deadlines: Deadline[] }>("/deadlines");
  return body.deadlines;
}

export async function createDeadline(input: DeadlineInput): Promise<Deadline> {
  const body = await apiRequest<{ deadline: Deadline }>("/deadlines", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.deadline;
}

export async function updateDeadline(
  id: string,
  input: Partial<DeadlineInput>,
): Promise<Deadline> {
  const body = await apiRequest<{ deadline: Deadline }>(`/deadlines/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return body.deadline;
}

export async function deleteDeadline(id: string): Promise<void> {
  await apiRequest<void>(`/deadlines/${id}`, { method: "DELETE" });
}

export function formatKindLabel(kind: RenewalKind): string {
  return kind
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
