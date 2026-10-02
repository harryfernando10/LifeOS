import { PageHeader } from "../components/ui/PageHeader";

export function VaultPage() {
  return (
    <section className="space-y-8">
      <PageHeader
        title="Vault"
        description="Your private repository for personal documents and their metadata."
      />
      <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
        <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
          Vault is empty
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
          Upload, versioning, and ownership-checked access will be added in the
          vault phases. Never store real personal documents during development.
        </p>
      </div>
    </section>
  );
}
