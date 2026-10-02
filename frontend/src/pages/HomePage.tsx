import { PageHeader } from "../components/ui/PageHeader";

export function HomePage() {
  return (
    <section className="space-y-8">
      <PageHeader
        title="Home"
        description="What needs my attention? The Action Center will live here once your records are connected."
      />
      <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
        <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
          Nothing to show yet
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
          Overdue items, renewals, and upcoming deadlines will appear in a calm
          list — not a crowded dashboard. Data sources arrive in later phases.
        </p>
      </div>
    </section>
  );
}
