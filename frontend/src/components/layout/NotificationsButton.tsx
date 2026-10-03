import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationList } from "../../api/notifications";
import { Button } from "../ui/Button";

export function NotificationsButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationList>({ items: [], unreadCount: 0 });

  useEffect(() => { void listNotifications().then(setNotifications).catch(() => undefined); }, []);

  async function openNotification(id: string, href: string) {
    try { await markNotificationRead(id); } catch { /* Navigation remains available if read tracking fails. */ }
    setNotifications(current => ({
      ...current,
      unreadCount: Math.max(0, current.unreadCount - (current.items.find(item => item.id === id)?.readAt ? 0 : 1)),
      items: current.items.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item),
    }));
    setOpen(false);
    void navigate(href);
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications(current => ({ ...current, unreadCount: 0, items: current.items.map(item => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })) }));
    } catch { /* Keep the panel available for retry. */ }
  }

  return <div className="relative">
    <Button variant="ghost" className="relative px-3 py-2" aria-label={`Notifications${notifications.unreadCount ? `, ${notifications.unreadCount} unread` : ""}`} aria-expanded={open} onClick={() => {
      const opening = !open;
      setOpen(opening);
      if (opening) void listNotifications().then(setNotifications).catch(() => undefined);
    }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      {notifications.unreadCount > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-[var(--lifeos-danger)] px-1.5 text-[10px] leading-4 text-white">{notifications.unreadCount}</span> : null}
    </Button>
    {open ? <section aria-label="Notifications" className="absolute right-0 z-40 mt-2 w-[min(22rem,90vw)] rounded-xl border border-[var(--lifeos-border)] bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Notifications</h2>
        {notifications.unreadCount ? <button className="text-xs text-[var(--lifeos-accent)] underline" onClick={() => void markAllRead()}>Mark all read</button> : null}
      </div>
      {notifications.items.length ? <ul className="mt-2 max-h-80 space-y-1 overflow-auto">{notifications.items.map(item => <li key={item.id}>
        <button className={`w-full rounded-lg px-3 py-2 text-left ${item.readAt ? "hover:bg-slate-50" : "bg-[var(--lifeos-accent-soft)]/50 hover:bg-[var(--lifeos-accent-soft)]"}`} onClick={() => void openNotification(item.id, item.href)}>
          <span className="block text-sm font-medium">{item.title}</span>
          <span className="mt-0.5 block text-xs text-[var(--lifeos-muted)]">{item.body}</span>
        </button>
      </li>)}</ul> : <p className="py-5 text-center text-sm text-[var(--lifeos-muted)]">Nothing needs attention right now.</p>}
    </section> : null}
  </div>;
}
