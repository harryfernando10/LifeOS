import { PageHeader } from "../components/ui/PageHeader";

export function CommitmentsPage() {
  return (
    <section className="space-y-8">
      <PageHeader
        title="Commitments"
        description="Subscriptions, recurring payments, and memberships in one place."
      />
      <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
        <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
          No commitments yet
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
          You will manage renewals, amounts, and external action URLs here.
          Commitment CRUD arrives in a later phase.
        </p>
      </div>
    </section>
  );
}
