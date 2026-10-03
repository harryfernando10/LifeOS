import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatSourceLabel,
  formatUrgencyLabel,
  getActionCenter,
  type ActionCenterItem,
} from "../api/actionCenter";
import { ApiRequestError } from "../api/client";
import { PageHeader } from "../components/ui/PageHeader";

function urgencyClassName(urgency: ActionCenterItem["urgency"]): string {
  return urgency === "overdue"
    ? "text-red-700 bg-red-50"
    : "text-[var(--lifeos-accent)] bg-[var(--lifeos-accent-soft)]";
}

export function HomePage() {
  const [items, setItems] = useState<ActionCenterItem[]>([]);
  const [windowDays, setWindowDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActionCenter();
      setItems(data.items);
      setWindowDays(data.upcomingWindowDays);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to load Action Center.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overdueCount = items.filter((item) => item.urgency === "overdue").length;

  return (
    <section className="space-y-8">
      <PageHeader
        title="Home"
        description="What needs my attention? A calm list of overdue and upcoming items from your records."
      />

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--lifeos-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
          <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
            Nothing needs attention
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
            No overdue or upcoming items in the next {windowDays} days. Add
            renewals, deadlines, commitments, documents, or warranties and they
            will show up here when they need action.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--lifeos-muted)]">
            {items.length} item{items.length === 1 ? "" : "s"}
            {overdueCount > 0
              ? ` · ${overdueCount} overdue`
              : ""}{" "}
            · next {windowDays} days
          </p>

          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <div className="rounded-xl border border-[var(--lifeos-border)] bg-white/70 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "rounded-md px-2 py-0.5 text-xs font-medium",
                            urgencyClassName(item.urgency),
                          ].join(" ")}
                        >
                          {formatUrgencyLabel(item.urgency)}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wide text-[var(--lifeos-muted)]">
                          {formatSourceLabel(item.sourceType)}
                        </span>
                      </div>
                      <p className="font-medium text-[var(--lifeos-ink)]">
                        {item.title}
                      </p>
                      {item.detail ? (
                        <p className="text-sm text-[var(--lifeos-muted)]">
                          {item.detail}
                        </p>
                      ) : null}
                      <p className="text-sm text-[var(--lifeos-ink-soft)]">
                        Due {item.dueOn}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        to={item.href}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--lifeos-accent)] transition hover:bg-[var(--lifeos-accent-soft)]"
                      >
                        Open
                      </Link>
                      {item.actionUrl ? (
                        <a
                          href={item.actionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--lifeos-ink-soft)] transition hover:bg-white/80"
                        >
                          Action link
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
