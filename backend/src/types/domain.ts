/**
 * Domain types aligned with the Phase 4 Prisma schema.
 * Prefer importing enums/models from `@prisma/client` in application code.
 * This module documents ownership conventions for later feature phases.
 */

export type {
  User,
  Session,
  Document,
  DocumentVersion,
  Subscription,
  RecurringPayment,
  Purchase,
  Warranty,
  Deadline,
  Renewal,
  InboxItem,
  Notification,
  AuditLog,
  DocumentCategory,
  DocumentStatus,
  BillingInterval,
  CommitmentStatus,
  DeadlineStatus,
  RenewalKind,
  RenewalStatus,
  InboxItemStatus,
  NotificationType,
} from "@prisma/client";

/**
 * Every user-owned domain table includes `userId`.
 * Warranty also includes `userId` (must match its Purchase owner) so Action Center
 * and ownership checks can filter with `where: { userId }` without joins.
 * DocumentVersion is owned indirectly via Document.userId.
 */
export const USER_OWNED_MODEL_NAMES = [
  "Document",
  "Subscription",
  "RecurringPayment",
  "Purchase",
  "Warranty",
  "Deadline",
  "Renewal",
  "InboxItem",
  "Notification",
  "AuditLog",
] as const;

export type UserOwnedModelName = (typeof USER_OWNED_MODEL_NAMES)[number];
