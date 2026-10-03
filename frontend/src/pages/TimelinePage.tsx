import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import {
  formatTemporalLabel,
  formatTimelineTypeLabel,
  getTimeline,
  type TimelineItem,
} from "../api/timeline";
import { PageHeader } from "../components/ui/PageHeader";

function temporalClassName(temporal: TimelineItem["temporal"]): string {
  switch (temporal) {
    case "past":
      return "text-[var(--lifeos-muted)] bg-white/80";
    case "today":
      return "text-[var(--lifeos-accent)] bg-[var(--lifeos-accent-soft)]";
    case "upcoming":
      return "text-[var(--lifeos-ink-soft)] bg-[var(--lifeos-accent-soft)]/60";
    default:
      return "text-[var(--lifeos-muted)] bg-white/80";
  }
}

export function TimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [pastDays, setPastDays] = useState(365);
  const [futureDays, setFutureDays] = useState(365);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTimeline();
      setItems(data.items);
      setPastDays(data.pastDays);
      setFutureDays(data.futureDays);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to load Timeline.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-8">
      <PageHeader
        title="Timeline"
        description="What has happened, is happening, or is scheduled — a chronological view of your life-admin events."
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
            Timeline is quiet
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
            No dated events in the past {pastDays} days or next {futureDays}{" "}
            days. Add renewals, deadlines, commitments, documents, or warranties
            and they will line up here by date. This is not a calendar
            replacement — just the administrative timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--lifeos-muted)]">
            {items.length} event{items.length === 1 ? "" : "s"} · past{" "}
            {pastDays} days to next {futureDays} days
          </p>

          <ol className="relative space-y-0 border-l border-[var(--lifeos-border)] pl-6">
            {items.map((item) => (
              <li key={item.id} className="relative pb-6 last:pb-0">
                <span
                  aria-hidden
                  className="absolute -left-[1.625rem] top-3 h-2.5 w-2.5 rounded-full border-2 border-[var(--lifeos-accent)] bg-[var(--lifeos-surface)]"
                />
                <div className="rounded-xl border border-[var(--lifeos-border)] bg-white/70 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "rounded-md px-2 py-0.5 text-xs font-medium",
                            temporalClassName(item.temporal),
                          ].join(" ")}
                        >
                          {formatTemporalLabel(item.temporal)}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wide text-[var(--lifeos-muted)]">
                          {formatTimelineTypeLabel(item.type)}
                        </span>
                        {item.status ? (
                          <span className="text-xs text-[var(--lifeos-muted)]">
                            {item.status.replaceAll("_", " ").toLowerCase()}
                          </span>
                        ) : null}
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
                        {item.date}
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
          </ol>
        </div>
      )}
    </section>
  );
}
