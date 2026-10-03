import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiRequestError } from "../api/client";
import { listDocuments, type VaultDocument } from "../api/documents";
import {
  createDeadline,
  createRenewal,
  DEADLINE_STATUSES,
  deleteDeadline,
  deleteRenewal,
  formatKindLabel,
  formatStatusLabel,
  listDeadlines,
  listRenewals,
  RENEWAL_KINDS,
  RENEWAL_STATUSES,
  updateDeadline,
  updateRenewal,
  type Deadline,
  type DeadlineStatus,
  type Renewal,
  type RenewalKind,
  type RenewalStatus,
} from "../api/renewalsDeadlines";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { useSearchParams } from "react-router-dom";

type LifecycleTab = "renewals" | "deadlines";

type RenewalFormState = {
  title: string;
  kind: RenewalKind;
  dueOn: string;
  status: RenewalStatus;
  actionUrl: string;
  notes: string;
  linkedDocumentId: string;
};

type DeadlineFormState = {
  title: string;
  dueOn: string;
  status: DeadlineStatus;
  actionUrl: string;
  notes: string;
  linkedDocumentId: string;
};

const emptyRenewalForm: RenewalFormState = {
  title: "",
  kind: "OTHER",
  dueOn: "",
  status: "UPCOMING",
  actionUrl: "",
  notes: "",
  linkedDocumentId: "",
};

const emptyDeadlineForm: DeadlineFormState = {
  title: "",
  dueOn: "",
  status: "OPEN",
  actionUrl: "",
  notes: "",
  linkedDocumentId: "",
};

function fieldClassName(): string {
  return "w-full rounded-lg border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)] px-3.5 py-2.5 text-[var(--lifeos-ink)] outline-none transition focus:border-[var(--lifeos-accent)] focus:ring-2 focus:ring-[var(--lifeos-accent-soft)]";
}

function optionalOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function RenewalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<LifecycleTab>("renewals");
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renewalForm, setRenewalForm] = useState(emptyRenewalForm);
  const [deadlineForm, setDeadlineForm] = useState(emptyDeadlineForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedRenewal =
    renewals.find((item) => item.id === selectedId) ?? null;
  const selectedDeadline =
    deadlines.find((item) => item.id === selectedId) ?? null;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [renewalItems, deadlineItems, docs] = await Promise.all([
        listRenewals(),
        listDeadlines(),
        listDocuments(),
      ]);
      setRenewals(renewalItems);
      setDeadlines(deadlineItems);
      setDocuments(docs);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to load renewals and deadlines.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const action = searchParams.get("action");
    const tab = searchParams.get("tab");
    if (tab === "renewals" || tab === "deadlines") setTab(tab);
    if (action === "renewal" || action === "deadline") {
      setTab(action === "renewal" ? "renewals" : "deadlines");
      setShowForm(true);
    }
    if (action || tab) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  function resetForms() {
    setRenewalForm(emptyRenewalForm);
    setDeadlineForm(emptyDeadlineForm);
    setEditingId(null);
    setShowForm(false);
  }

  function beginCreate() {
    resetForms();
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function beginEditRenewal(item: Renewal) {
    setEditingId(item.id);
    setSelectedId(item.id);
    setRenewalForm({
      title: item.title,
      kind: item.kind,
      dueOn: item.dueOn,
      status: item.status,
      actionUrl: item.actionUrl ?? "",
      notes: item.notes ?? "",
      linkedDocumentId: item.linkedDocumentId ?? "",
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function beginEditDeadline(item: Deadline) {
    setEditingId(item.id);
    setSelectedId(item.id);
    setDeadlineForm({
      title: item.title,
      dueOn: item.dueOn,
      status: item.status,
      actionUrl: item.actionUrl ?? "",
      notes: item.notes ?? "",
      linkedDocumentId: item.linkedDocumentId ?? "",
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  async function handleRenewalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        title: renewalForm.title.trim(),
        kind: renewalForm.kind,
        dueOn: renewalForm.dueOn,
        status: renewalForm.status,
        actionUrl: optionalOrNull(renewalForm.actionUrl),
        notes: optionalOrNull(renewalForm.notes),
        linkedDocumentId: optionalOrNull(renewalForm.linkedDocumentId),
      };

      if (editingId) {
        const updated = await updateRenewal(editingId, payload);
        setRenewals((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSelectedId(updated.id);
        setSuccess("Renewal updated.");
      } else {
        const created = await createRenewal(payload);
        setRenewals((current) => [created, ...current]);
        setSelectedId(created.id);
        setSuccess("Renewal created.");
      }
      resetForms();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to save renewal.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeadlineSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        title: deadlineForm.title.trim(),
        dueOn: deadlineForm.dueOn,
        status: deadlineForm.status,
        actionUrl: optionalOrNull(deadlineForm.actionUrl),
        notes: optionalOrNull(deadlineForm.notes),
        linkedDocumentId: optionalOrNull(deadlineForm.linkedDocumentId),
      };

      if (editingId) {
        const updated = await updateDeadline(editingId, payload);
        setDeadlines((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSelectedId(updated.id);
        setSuccess("Deadline updated.");
      } else {
        const created = await createDeadline(payload);
        setDeadlines((current) => [created, ...current]);
        setSelectedId(created.id);
        setSuccess("Deadline created.");
      }
      resetForms();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to save deadline.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRenewal(id: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await deleteRenewal(id);
      setRenewals((current) => current.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      if (editingId === id) {
        resetForms();
      }
      setSuccess("Renewal deleted.");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to delete renewal.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteDeadline(id: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await deleteDeadline(id);
      setDeadlines((current) => current.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      if (editingId === id) {
        resetForms();
      }
      setSuccess("Deadline deleted.");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to delete deadline.");
      }
    } finally {
      setBusyId(null);
    }
  }

  const isEmpty =
    tab === "renewals" ? renewals.length === 0 : deadlines.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Renewals & deadlines"
          description="Track lifecycle renewals and one-off deadlines with due dates and action links."
        />
        <Button
          onClick={() => {
            beginCreate();
          }}
          className="shrink-0"
        >
          {tab === "renewals" ? "Add renewal" : "Add deadline"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "renewals" ? "primary" : "secondary"}
          onClick={() => {
            setTab("renewals");
            resetForms();
            setSelectedId(null);
            setError(null);
            setSuccess(null);
          }}
        >
          Renewals
        </Button>
        <Button
          variant={tab === "deadlines" ? "primary" : "secondary"}
          onClick={() => {
            setTab("deadlines");
            resetForms();
            setSelectedId(null);
            setError(null);
            setSuccess(null);
          }}
        >
          Deadlines
        </Button>
      </div>

      {showForm ? (
        tab === "renewals" ? (
          <form
            onSubmit={(event) => {
              void handleRenewalSubmit(event);
            }}
            className="space-y-4 rounded-2xl border border-[var(--lifeos-border)] bg-white/60 p-5"
          >
            <h2 className="text-lg font-semibold text-[var(--lifeos-ink)]">
              {editingId ? "Edit renewal" : "New renewal"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Title"
                required
                value={renewalForm.title}
                onChange={(event) =>
                  setRenewalForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--lifeos-ink-soft)]">
                  Kind
                </span>
                <select
                  className={fieldClassName()}
                  value={renewalForm.kind}
                  onChange={(event) =>
                    setRenewalForm((current) => ({
                      ...current,
                      kind: event.target.value as RenewalKind,
                    }))
                  }
                >
                  {RENEWAL_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {formatKindLabel(kind)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Due on"
                type="date"
                required
                value={renewalForm.dueOn}
                onChange={(event) =>
                  setRenewalForm((current) => ({
                    ...current,
                    dueOn: event.target.value,
                  }))
                }
              />
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--lifeos-ink-soft)]">
                  Status
                </span>
                <select
                  className={fieldClassName()}
                  value={renewalForm.status}
                  onChange={(event) =>
                    setRenewalForm((current) => ({
                      ...current,
                      status: event.target.value as RenewalStatus,
                    }))
                  }
                >
                  {RENEWAL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Action URL"
                type="url"
                placeholder="https://"
                value={renewalForm.actionUrl}
                onChange={(event) =>
                  setRenewalForm((current) => ({
                    ...current,
                    actionUrl: event.target.value,
                  }))
                }
              />
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--lifeos-ink-soft)]">
                  Linked document
                </span>
                <select
                  className={fieldClassName()}
                  value={renewalForm.linkedDocumentId}
                  onChange={(event) =>
                    setRenewalForm((current) => ({
                      ...current,
                      linkedDocumentId: event.target.value,
                    }))
                  }
                >
                  <option value="">None</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--lifeos-ink-soft)]">
                Notes
              </span>
              <textarea
                className={fieldClassName()}
                rows={3}
                value={renewalForm.notes}
                onChange={(event) =>
                  setRenewalForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetForms();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(event) => {
              void handleDeadlineSubmit(event);
            }}
            className="space-y-4 rounded-2xl border border-[var(--lifeos-border)] bg-white/60 p-5"
          >
            <h2 className="text-lg font-semibold text-[var(--lifeos-ink)]">
              {editingId ? "Edit deadline" : "New deadline"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Title"
                required
                value={deadlineForm.title}
                onChange={(event) =>
                  setDeadlineForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
              <Input
                label="Due on"
                type="date"
                required
                value={deadlineForm.dueOn}
                onChange={(event) =>
                  setDeadlineForm((current) => ({
                    ...current,
                    dueOn: event.target.value,
                  }))
                }
              />
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--lifeos-ink-soft)]">
                  Status
                </span>
                <select
                  className={fieldClassName()}
                  value={deadlineForm.status}
                  onChange={(event) =>
                    setDeadlineForm((current) => ({
                      ...current,
                      status: event.target.value as DeadlineStatus,
                    }))
                  }
                >
                  {DEADLINE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Action URL"
                type="url"
                placeholder="https://"
                value={deadlineForm.actionUrl}
                onChange={(event) =>
                  setDeadlineForm((current) => ({
                    ...current,
                    actionUrl: event.target.value,
                  }))
                }
              />
              <label className="block space-y-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-[var(--lifeos-ink-soft)]">
                  Linked document
                </span>
                <select
                  className={fieldClassName()}
                  value={deadlineForm.linkedDocumentId}
                  onChange={(event) =>
                    setDeadlineForm((current) => ({
                      ...current,
                      linkedDocumentId: event.target.value,
                    }))
                  }
                >
                  <option value="">None</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--lifeos-ink-soft)]">
                Notes
              </span>
              <textarea
                className={fieldClassName()}
                rows={3}
                value={deadlineForm.notes}
                onChange={(event) =>
                  setDeadlineForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetForms();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--lifeos-muted)]">Loading…</p>
      ) : isEmpty && !showForm ? (
        <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
          <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
            {tab === "renewals" ? "No renewals yet" : "No deadlines yet"}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
            {tab === "renewals"
              ? "Add passports, licences, insurance, domains, and other lifecycle renewals with due dates and action URLs."
              : "Track applications, submissions, and appointments that need attention by a date."}
          </p>
        </div>
      ) : tab === "renewals" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <ul className="space-y-3">
            {renewals.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={[
                    "w-full rounded-xl border px-4 py-3 text-left transition",
                    selectedId === item.id
                      ? "border-[var(--lifeos-accent)] bg-[var(--lifeos-accent-soft)]"
                      : "border-[var(--lifeos-border)] bg-white/60 hover:border-[var(--lifeos-accent)]/40",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--lifeos-ink)]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--lifeos-muted)]">
                        {formatKindLabel(item.kind)} · Due {item.dueOn} ·{" "}
                        {formatStatusLabel(item.status)}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {selectedRenewal ? (
            <aside className="space-y-4 rounded-2xl border border-[var(--lifeos-border)] bg-white/60 p-5">
              <h2 className="text-lg font-semibold text-[var(--lifeos-ink)]">
                {selectedRenewal.title}
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-[var(--lifeos-muted)]">Kind</dt>
                  <dd>{formatKindLabel(selectedRenewal.kind)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--lifeos-muted)]">Due on</dt>
                  <dd>{selectedRenewal.dueOn}</dd>
                </div>
                <div>
                  <dt className="text-[var(--lifeos-muted)]">Status</dt>
                  <dd>{formatStatusLabel(selectedRenewal.status)}</dd>
                </div>
                {selectedRenewal.actionUrl ? (
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Action</dt>
                    <dd>
                      <a
                        href={selectedRenewal.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--lifeos-accent)] underline"
                      >
                        Open link
                      </a>
                    </dd>
                  </div>
                ) : null}
                {selectedRenewal.linkedDocumentTitle ? (
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Document</dt>
                    <dd>{selectedRenewal.linkedDocumentTitle}</dd>
                  </div>
                ) : null}
                {selectedRenewal.notes ? (
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Notes</dt>
                    <dd className="whitespace-pre-wrap">
                      {selectedRenewal.notes}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => beginEditRenewal(selectedRenewal)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  disabled={busyId === selectedRenewal.id}
                  onClick={() => {
                    void handleDeleteRenewal(selectedRenewal.id);
                  }}
                >
                  {busyId === selectedRenewal.id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </aside>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <ul className="space-y-3">
            {deadlines.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={[
                    "w-full rounded-xl border px-4 py-3 text-left transition",
                    selectedId === item.id
                      ? "border-[var(--lifeos-accent)] bg-[var(--lifeos-accent-soft)]"
                      : "border-[var(--lifeos-border)] bg-white/60 hover:border-[var(--lifeos-accent)]/40",
                  ].join(" ")}
                >
                  <p className="font-medium text-[var(--lifeos-ink)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--lifeos-muted)]">
                    Due {item.dueOn} · {formatStatusLabel(item.status)}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {selectedDeadline ? (
            <aside className="space-y-4 rounded-2xl border border-[var(--lifeos-border)] bg-white/60 p-5">
              <h2 className="text-lg font-semibold text-[var(--lifeos-ink)]">
                {selectedDeadline.title}
              </h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-[var(--lifeos-muted)]">Due on</dt>
                  <dd>{selectedDeadline.dueOn}</dd>
                </div>
                <div>
                  <dt className="text-[var(--lifeos-muted)]">Status</dt>
                  <dd>{formatStatusLabel(selectedDeadline.status)}</dd>
                </div>
                {selectedDeadline.actionUrl ? (
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Action</dt>
                    <dd>
                      <a
                        href={selectedDeadline.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--lifeos-accent)] underline"
                      >
                        Open link
                      </a>
                    </dd>
                  </div>
                ) : null}
                {selectedDeadline.linkedDocumentTitle ? (
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Document</dt>
                    <dd>{selectedDeadline.linkedDocumentTitle}</dd>
                  </div>
                ) : null}
                {selectedDeadline.notes ? (
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Notes</dt>
                    <dd className="whitespace-pre-wrap">
                      {selectedDeadline.notes}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => beginEditDeadline(selectedDeadline)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  disabled={busyId === selectedDeadline.id}
                  onClick={() => {
                    void handleDeleteDeadline(selectedDeadline.id);
                  }}
                >
                  {busyId === selectedDeadline.id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}
