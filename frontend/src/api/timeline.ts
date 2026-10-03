import { apiRequest } from "./client";

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
  date: string;
  status: string | null;
  temporal: TimelineTemporal;
  sourceId: string;
  href: string;
  actionUrl: string | null;
};

export type Timeline = {
  generatedAt: string;
  rangeStart: string;
  rangeEnd: string;
  pastDays: number;
  futureDays: number;
  items: TimelineItem[];
};

export async function getTimeline(): Promise<Timeline> {
  return apiRequest<Timeline>("/timeline");
}

export function formatTimelineTypeLabel(type: TimelineEventType): string {
  switch (type) {
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
      return type;
  }
}

export function formatTemporalLabel(temporal: TimelineTemporal): string {
  switch (temporal) {
    case "past":
      return "Past";
    case "today":
      return "Today";
    case "upcoming":
      return "Upcoming";
    default:
      return temporal;
  }
}
