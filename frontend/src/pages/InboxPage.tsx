import { PageHeader } from "../components/ui/PageHeader";

export function InboxPage() {
  return (
    <section className="space-y-8">
      <PageHeader
        title="Inbox"
        description="A dump zone for uncategorized files you will review later."
      />
      <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
        <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
          Inbox shell ready
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
          Full Life Inbox upload and manual categorization is post-MVP. This
          route exists so the application map stays complete.
        </p>
      </div>
    </section>
  );
}
