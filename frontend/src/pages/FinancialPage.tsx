import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import {
  formatMoneyAmount,
  formatSourceTypeLabel,
  formatWindowTotals,
  getFinancialCommitments,
  type FinancialWindow,
} from "../api/financialCommitments";
import { PageHeader } from "../components/ui/PageHeader";

export function FinancialPage() {
  const [windows, setWindows] = useState<FinancialWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDays, setActiveDays] = useState<number>(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFinancialCommitments();
      setWindows(data.windows);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to load financial commitments.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeWindow =
    windows.find((w) => w.days === activeDays) ?? windows[0] ?? null;
  const allEmpty = windows.every((w) => w.items.length === 0);

  return (
    <section className="space-y-8">
      <PageHeader
        title="Financial commitments"
        description="Expected recurring commitments over the next 7, 30, and 365 days. Not a budget, bank, or investment tool."
      />

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--lifeos-muted)]">Loading…</p>
      ) : allEmpty ? (
        <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
          <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
            No expected recurring amounts
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
            Add active subscriptions or recurring payments with a next billing
            or due date and an amount. Totals are derived from those records —
            purchases are not treated as recurring expenses.
          </p>
          <p className="mt-4">
            <Link
              to="/app/commitments"
              className="text-sm font-medium text-[var(--lifeos-accent)] hover:underline"
            >
              Open Commitments
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {windows.map((window) => {
              const selected = window.days === activeWindow?.days;
              return (
                <button
                  key={window.days}
                  type="button"
                  onClick={() => setActiveDays(window.days)}
                  className={[
                    "rounded-lg px-3 py-2 text-left text-sm transition",
                    selected
                      ? "bg-[var(--lifeos-accent-soft)] text-[var(--lifeos-accent)]"
                      : "bg-white/70 text-[var(--lifeos-ink-soft)] hover:bg-white",
                  ].join(" ")}
                >
                  <span className="block font-medium">
                    Next {window.days} days
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--lifeos-muted)]">
                    {formatWindowTotals(window.totalsByCurrency)}
                  </span>
                </button>
              );
            })}
          </div>

          {activeWindow ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--lifeos-border)] bg-white/70 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--lifeos-muted)]">
                  Next {activeWindow.days} days
                </p>
                <p className="mt-1 text-lg font-medium text-[var(--lifeos-ink)]">
                  {formatWindowTotals(activeWindow.totalsByCurrency)}
                </p>
                <p className="mt-1 text-sm text-[var(--lifeos-muted)]">
                  {activeWindow.rangeStart} → {activeWindow.rangeEnd} ·{" "}
                  {activeWindow.items.length} occurrence
                  {activeWindow.items.length === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--lifeos-muted)]">
                  Amounts are summed per currency with no conversion. Null
                  amounts are listed but not totaled.
                </p>
              </div>

              {activeWindow.items.length === 0 ? (
                <p className="text-sm text-[var(--lifeos-muted)]">
                  Nothing due in this window.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activeWindow.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-[var(--lifeos-border)] bg-white/70 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-[var(--lifeos-muted)]">
                              {formatSourceTypeLabel(item.sourceType)}
                            </span>
                            <span className="text-xs text-[var(--lifeos-muted)]">
                              {item.billingInterval.toLowerCase()}
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
                        <div className="shrink-0 text-right">
                          <p className="font-medium text-[var(--lifeos-ink)]">
                            {formatMoneyAmount(item.amount, item.currency)}
                          </p>
                          <div className="mt-2 flex flex-wrap justify-end gap-2">
                            <Link
                              to={item.href}
                              className="text-sm font-medium text-[var(--lifeos-accent)] hover:underline"
                            >
                              Open
                            </Link>
                            {item.actionUrl ? (
                              <a
                                href={item.actionUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-[var(--lifeos-ink-soft)] hover:underline"
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
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
