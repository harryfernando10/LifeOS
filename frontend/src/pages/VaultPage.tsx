import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createDocument,
  deleteDocument,
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  downloadDocument,
  formatCategoryLabel,
  formatFileSize,
  listDocuments,
  updateDocument,
  type DocumentCategory,
  type DocumentStatus,
  type VaultDocument,
} from "../api/documents";
import { ApiRequestError } from "../api/client";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";

type UploadFormState = {
  title: string;
  category: DocumentCategory;
  status: DocumentStatus;
  description: string;
  issuedOn: string;
  expiresOn: string;
  notes: string;
  file: File | null;
};

const emptyUploadForm: UploadFormState = {
  title: "",
  category: "OTHER",
  status: "ACTIVE",
  description: "",
  issuedOn: "",
  expiresOn: "",
  notes: "",
  file: null,
};

function fieldClassName(): string {
  return "w-full rounded-lg border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)] px-3.5 py-2.5 text-[var(--lifeos-ink)] outline-none transition focus:border-[var(--lifeos-accent)] focus:ring-2 focus:ring-[var(--lifeos-accent-soft)]";
}

export function VaultPage() {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(emptyUploadForm);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<DocumentStatus>("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const selected = documents.find((doc) => doc.id === selectedId) ?? null;

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listDocuments();
      setDocuments(items);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to load documents.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (selected) {
      setEditNotes(selected.notes ?? "");
      setEditStatus(selected.status);
    }
  }, [selected]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(null);
    setError(null);

    if (!uploadForm.file) {
      setError("Choose a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const created = await createDocument({
        title: uploadForm.title.trim(),
        category: uploadForm.category,
        status: uploadForm.status,
        description: uploadForm.description.trim() || undefined,
        issuedOn: uploadForm.issuedOn || undefined,
        expiresOn: uploadForm.expiresOn || undefined,
        notes: uploadForm.notes.trim() || undefined,
        file: uploadForm.file,
      });
      setDocuments((current) => [created, ...current]);
      setUploadForm(emptyUploadForm);
      setShowUpload(false);
      setSelectedId(created.id);
      setSuccess("Document uploaded.");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(id: string) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await downloadDocument(id);
      setSuccess("Download started.");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Download failed.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this document and its stored file? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await deleteDocument(id);
      setDocuments((current) => current.filter((doc) => doc.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      setSuccess("Document deleted.");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Delete failed.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateDocument(selected.id, {
        status: editStatus,
        notes: editNotes.trim() || null,
      });
      setDocuments((current) =>
        current.map((doc) => (doc.id === updated.id ? updated : doc)),
      );
      setSuccess("Document updated.");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Update failed.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Vault"
          description="Private documents with structured metadata. Use sample files only during development."
        />
        <Button
          type="button"
          onClick={() => {
            setShowUpload((value) => !value);
            setError(null);
            setSuccess(null);
          }}
        >
          {showUpload ? "Close upload" : "Add document"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-[var(--lifeos-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-[var(--lifeos-accent)]" role="status">
          {success}
        </p>
      ) : null}

      {showUpload ? (
        <form
          onSubmit={handleUpload}
          className="space-y-4 rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold tracking-tight text-[var(--lifeos-ink)]">
            Upload document
          </h2>
          <p className="text-sm text-[var(--lifeos-muted)]">
            Allowed types: PDF, JPEG, PNG, WEBP. Maximum size: 10 MB (or your
            configured limit).
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Title"
              name="title"
              required
              value={uploadForm.title}
              onChange={(event) =>
                setUploadForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Passport scan"
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                Category
              </span>
              <select
                className={fieldClassName()}
                value={uploadForm.category}
                onChange={(event) =>
                  setUploadForm((current) => ({
                    ...current,
                    category: event.target.value as DocumentCategory,
                  }))
                }
              >
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {formatCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                Status
              </span>
              <select
                className={fieldClassName()}
                value={uploadForm.status}
                onChange={(event) =>
                  setUploadForm((current) => ({
                    ...current,
                    status: event.target.value as DocumentStatus,
                  }))
                }
              >
                {DOCUMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>

            <Input
              label="File"
              name="file"
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setUploadForm((current) => ({
                  ...current,
                  file: event.target.files?.[0] ?? null,
                }))
              }
            />

            <Input
              label="Issued on"
              name="issuedOn"
              type="date"
              value={uploadForm.issuedOn}
              onChange={(event) =>
                setUploadForm((current) => ({
                  ...current,
                  issuedOn: event.target.value,
                }))
              }
            />

            <Input
              label="Expires on"
              name="expiresOn"
              type="date"
              value={uploadForm.expiresOn}
              onChange={(event) =>
                setUploadForm((current) => ({
                  ...current,
                  expiresOn: event.target.value,
                }))
              }
            />
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
              Description
            </span>
            <textarea
              className={`${fieldClassName()} min-h-20`}
              value={uploadForm.description}
              onChange={(event) =>
                setUploadForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Optional short description"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
              Notes
            </span>
            <textarea
              className={`${fieldClassName()} min-h-20`}
              value={uploadForm.notes}
              onChange={(event) =>
                setUploadForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Optional notes"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => {
                setShowUpload(false);
                setUploadForm(emptyUploadForm);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--lifeos-muted)]">Loading documents…</p>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
          <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
            No documents yet
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
            Add your first private document to the vault. Never upload real
            personal identity or financial documents during development.
          </p>
          <Button
            type="button"
            className="mt-5"
            onClick={() => setShowUpload(true)}
          >
            Add document
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <ul className="divide-y divide-[var(--lifeos-border)] overflow-hidden rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90">
            {documents.map((doc) => {
              const isActive = doc.id === selectedId;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    className={[
                      "flex w-full flex-col gap-1 px-4 py-4 text-left transition",
                      isActive
                        ? "bg-[var(--lifeos-accent-soft)]"
                        : "hover:bg-white/80",
                    ].join(" ")}
                    onClick={() => setSelectedId(doc.id)}
                  >
                    <span className="text-sm font-semibold text-[var(--lifeos-ink)]">
                      {doc.title}
                    </span>
                    <span className="text-xs text-[var(--lifeos-muted)]">
                      {formatCategoryLabel(doc.category)} · {doc.status}
                      {doc.expiresOn ? ` · Expires ${doc.expiresOn}` : ""}
                    </span>
                    <span className="text-xs text-[var(--lifeos-muted)]">
                      {doc.currentVersion?.originalFileName ?? "No file"} ·{" "}
                      {formatFileSize(doc.currentVersion?.sizeBytes)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-5">
            {selected ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--lifeos-ink)]">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--lifeos-muted)]">
                    {formatCategoryLabel(selected.category)}
                  </p>
                </div>

                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Status</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {selected.status}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Issued / expires</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {selected.issuedOn ?? "—"} / {selected.expiresOn ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">File</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {selected.currentVersion?.originalFileName ?? "—"} (
                      {selected.currentVersion?.mimeType ?? "unknown"},{" "}
                      {formatFileSize(selected.currentVersion?.sizeBytes)})
                    </dd>
                  </div>
                  {selected.description ? (
                    <div>
                      <dt className="text-[var(--lifeos-muted)]">Description</dt>
                      <dd className="text-[var(--lifeos-ink-soft)]">
                        {selected.description}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <form onSubmit={handleSaveMetadata} className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                      Status
                    </span>
                    <select
                      className={fieldClassName()}
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(event.target.value as DocumentStatus)
                      }
                    >
                      {DOCUMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                      Notes
                    </span>
                    <textarea
                      className={`${fieldClassName()} min-h-24`}
                      value={editNotes}
                      onChange={(event) => setEditNotes(event.target.value)}
                    />
                  </label>

                  <Button type="submit" variant="secondary" disabled={saving}>
                    {saving ? "Saving…" : "Save metadata"}
                  </Button>
                </form>

                <div className="flex flex-wrap gap-3 border-t border-[var(--lifeos-border)] pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      void handleDownload(selected.id);
                    }}
                    disabled={busyId === selected.id}
                  >
                    {busyId === selected.id ? "Working…" : "Download"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--lifeos-danger)]"
                    onClick={() => {
                      void handleDelete(selected.id);
                    }}
                    disabled={busyId === selected.id}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--lifeos-muted)]">
                Select a document to view metadata, download, or delete it.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
