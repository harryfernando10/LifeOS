import { apiRequest } from "./client";

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

export type ActionCenter = {
  generatedAt: string;
  upcomingWindowDays: number;
  items: ActionCenterItem[];
};

export async function getActionCenter(): Promise<ActionCenter> {
  return apiRequest<ActionCenter>("/action-center");
}

export function formatSourceLabel(sourceType: ActionSourceType): string {
  switch (sourceType) {
    case "deadline":
      return "Deadline";
    case "renewal":
      return "Renewal";
    case "document":
      return "Document";
    case "subscription":
      return "Subscription";
    case "recurring_payment":
      return "Recurring payment";
    case "warranty":
      return "Warranty";
    default:
      return sourceType;
  }
}

export function formatUrgencyLabel(urgency: ActionUrgency): string {
  return urgency === "overdue" ? "Overdue" : "Upcoming";
}
