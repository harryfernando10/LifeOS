import { apiRequest } from "./client";

export type LifeNotification = { id: string; type: string; title: string; body: string | null; relatedEntityType: string | null; relatedEntityId: string | null; dueOn: string | null; readAt: string | null; createdAt: string; href: string };
export type NotificationList = { items: LifeNotification[]; unreadCount: number };
export async function listNotifications() { return apiRequest<NotificationList>("/notifications"); }
export async function markNotificationRead(id: string) { await apiRequest<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }); }
export async function markAllNotificationsRead() { await apiRequest<void>("/notifications/read-all", { method: "PATCH" }); }
