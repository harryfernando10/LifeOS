import { PageHeader } from "../components/ui/PageHeader";

export function TimelinePage() {
  return (
    <section className="space-y-8">
      <PageHeader
        title="Timeline"
        description="A chronological view of deadlines, renewals, warranties, and related events."
      />
      <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
        <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
          Timeline is quiet
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
          Events will line up by date once records exist. This is not a calendar
          replacement — just the administrative timeline.
        </p>
      </div>
    </section>
  );
}
