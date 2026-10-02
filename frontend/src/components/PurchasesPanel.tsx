import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiRequestError } from "../api/client";
import { listDocuments, type VaultDocument } from "../api/documents";
import {
  createPurchase,
  deletePurchase,
  deleteWarranty,
  formatMoney,
  listPurchases,
  updatePurchase,
  upsertWarranty,
  warrantyStatusLabel,
  type Purchase,
} from "../api/purchases";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

type PurchaseFormState = {
  name: string;
  purchasedOn: string;
  amount: string;
  currency: string;
  vendor: string;
  notes: string;
  receiptDocumentId: string;
};

type WarrantyFormState = {
  provider: string;
  startsOn: string;
  endsOn: string;
  terms: string;
  notes: string;
};

const emptyPurchaseForm: PurchaseFormState = {
  name: "",
  purchasedOn: "",
  amount: "",
  currency: "INR",
  vendor: "",
  notes: "",
  receiptDocumentId: "",
};

const emptyWarrantyForm: WarrantyFormState = {
  provider: "",
  startsOn: "",
  endsOn: "",
  terms: "",
  notes: "",
};

function fieldClassName(): string {
  return "w-full rounded-lg border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)] px-3.5 py-2.5 text-[var(--lifeos-ink)] outline-none transition focus:border-[var(--lifeos-accent)] focus:ring-2 focus:ring-[var(--lifeos-accent-soft)]";
}

function optionalOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function PurchasesPanel() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);
  const [warrantyForm, setWarrantyForm] = useState(emptyWarrantyForm);
  const [showWarrantyForm, setShowWarrantyForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected =
    purchases.find((item) => item.id === selectedId) ?? null;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, docs] = await Promise.all([
        listPurchases(),
        listDocuments(),
      ]);
      setPurchases(items);
      setDocuments(docs);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to load purchases.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function resetForms() {
    setPurchaseForm(emptyPurchaseForm);
    setWarrantyForm(emptyWarrantyForm);
    setEditingId(null);
    setShowForm(false);
    setShowWarrantyForm(false);
  }

  function beginCreate() {
    resetForms();
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function beginEdit(item: Purchase) {
    setEditingId(item.id);
    setSelectedId(item.id);
    setPurchaseForm({
      name: item.name,
      purchasedOn: item.purchasedOn,
      amount: item.amount ?? "",
      currency: item.currency,
      vendor: item.vendor ?? "",
      notes: item.notes ?? "",
      receiptDocumentId: item.receiptDocumentId ?? "",
    });
    setShowForm(true);
    setShowWarrantyForm(false);
    setError(null);
    setSuccess(null);
  }

  function beginWarrantyEdit(item: Purchase) {
    setSelectedId(item.id);
    setWarrantyForm({
      provider: item.warranty?.provider ?? "",
      startsOn: item.warranty?.startsOn ?? "",
      endsOn: item.warranty?.endsOn ?? "",
      terms: item.warranty?.terms ?? "",
      notes: item.warranty?.notes ?? "",
    });
    setShowWarrantyForm(true);
    setShowForm(false);
    setError(null);
    setSuccess(null);
  }

  async function handlePurchaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: purchaseForm.name.trim(),
        purchasedOn: purchaseForm.purchasedOn,
        amount: optionalOrNull(purchaseForm.amount),
        currency: purchaseForm.currency.trim().toUpperCase() || "INR",
        vendor: optionalOrNull(purchaseForm.vendor),
        notes: optionalOrNull(purchaseForm.notes),
        receiptDocumentId: optionalOrNull(purchaseForm.receiptDocumentId),
      };

      if (editingId) {
        const updated = await updatePurchase(editingId, payload);
        setPurchases((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSelectedId(updated.id);
        setSuccess("Purchase updated.");
      } else {
        const created = await createPurchase(payload);
        setPurchases((current) => [created, ...current]);
        setSelectedId(created.id);
        setSuccess("Purchase created.");
      }
      resetForms();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to save purchase.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleWarrantySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await upsertWarranty(selectedId, {
        provider: optionalOrNull(warrantyForm.provider),
        startsOn: optionalOrNull(warrantyForm.startsOn),
        endsOn: warrantyForm.endsOn,
        terms: optionalOrNull(warrantyForm.terms),
        notes: optionalOrNull(warrantyForm.notes),
      });
      setPurchases((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedId(updated.id);
      setShowWarrantyForm(false);
      setSuccess("Warranty saved.");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to save warranty.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this purchase? Its warranty will also be removed.",
    );
    if (!confirmed) {
      return;
    }
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await deletePurchase(id);
      setPurchases((current) => current.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      if (editingId === id) {
        resetForms();
      }
      setSuccess("Purchase deleted.");
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

  async function handleDeleteWarranty(purchaseId: string) {
    const confirmed = window.confirm("Remove warranty from this purchase?");
    if (!confirmed) {
      return;
    }
    setBusyId(purchaseId);
    setError(null);
    setSuccess(null);
    try {
      const updated = await deleteWarranty(purchaseId);
      setPurchases((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setShowWarrantyForm(false);
      setSuccess("Warranty removed.");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to remove warranty.");
      }
    } finally {
      setBusyId(null);
    }
  }

  const isEmpty = !loading && purchases.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--lifeos-ink-soft)]">
          Record purchases, optional warranties, and link an existing Vault
          receipt. No OCR or receipt intelligence in this phase.
        </p>
        <Button
          type="button"
          onClick={() => {
            if (showForm && !editingId) {
              resetForms();
              return;
            }
            beginCreate();
          }}
        >
          {showForm && !editingId ? "Close form" : "Add purchase"}
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

      {showForm ? (
        <form
          onSubmit={handlePurchaseSubmit}
          className="space-y-4 rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-5"
        >
          <h2 className="text-lg font-semibold text-[var(--lifeos-ink)]">
            {editingId ? "Edit purchase" : "Add purchase"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Product / item"
              required
              value={purchaseForm.name}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Laptop"
            />
            <Input
              label="Purchase date"
              type="date"
              required
              value={purchaseForm.purchasedOn}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  purchasedOn: event.target.value,
                }))
              }
            />
            <Input
              label="Amount"
              value={purchaseForm.amount}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
              placeholder="89999.00"
            />
            <Input
              label="Currency"
              value={purchaseForm.currency}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  currency: event.target.value,
                }))
              }
            />
            <Input
              label="Seller / vendor"
              value={purchaseForm.vendor}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  vendor: event.target.value,
                }))
              }
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                Receipt (Vault document)
              </span>
              <select
                className={fieldClassName()}
                value={purchaseForm.receiptDocumentId}
                onChange={(event) =>
                  setPurchaseForm((current) => ({
                    ...current,
                    receiptDocumentId: event.target.value,
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
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
              Notes
            </span>
            <textarea
              className={`${fieldClassName()} min-h-20`}
              value={purchaseForm.notes}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={resetForms}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {showWarrantyForm && selected ? (
        <form
          onSubmit={handleWarrantySubmit}
          className="space-y-4 rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-5"
        >
          <h2 className="text-lg font-semibold text-[var(--lifeos-ink)]">
            {selected.warranty ? "Edit warranty" : "Add warranty"} —{" "}
            {selected.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Provider"
              value={warrantyForm.provider}
              onChange={(event) =>
                setWarrantyForm((current) => ({
                  ...current,
                  provider: event.target.value,
                }))
              }
            />
            <Input
              label="Starts on"
              type="date"
              value={warrantyForm.startsOn}
              onChange={(event) =>
                setWarrantyForm((current) => ({
                  ...current,
                  startsOn: event.target.value,
                }))
              }
            />
            <Input
              label="Ends on"
              type="date"
              required
              value={warrantyForm.endsOn}
              onChange={(event) =>
                setWarrantyForm((current) => ({
                  ...current,
                  endsOn: event.target.value,
                }))
              }
            />
            <Input
              label="Terms"
              value={warrantyForm.terms}
              onChange={(event) =>
                setWarrantyForm((current) => ({
                  ...current,
                  terms: event.target.value,
                }))
              }
            />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
              Notes
            </span>
            <textarea
              className={`${fieldClassName()} min-h-20`}
              value={warrantyForm.notes}
              onChange={(event) =>
                setWarrantyForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save warranty"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => setShowWarrantyForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--lifeos-ink-soft)]">Loading purchases…</p>
      ) : null}

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] px-6 py-12 text-center">
          <p className="text-[var(--lifeos-ink)]">No purchases yet</p>
          <p className="mt-2 text-sm text-[var(--lifeos-ink-soft)]">
            Add a purchase to track the product, optional warranty expiry, and a
            linked Vault receipt.
          </p>
        </div>
      ) : null}

      {!loading && purchases.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <ul className="space-y-3">
            {purchases.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    selectedId === item.id
                      ? "border-[var(--lifeos-accent)] bg-[var(--lifeos-accent-soft)]/40"
                      : "border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/80 hover:border-[var(--lifeos-accent)]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--lifeos-ink)]">
                        {item.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--lifeos-ink-soft)]">
                        {item.purchasedOn}
                        {item.vendor ? ` · ${item.vendor}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm text-[var(--lifeos-ink-soft)]">
                      <p>{formatMoney(item.amount, item.currency)}</p>
                      <p className="mt-1">{warrantyStatusLabel(item.warranty)}</p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <aside className="rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-5">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--lifeos-ink)]">
                    {selected.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--lifeos-ink-soft)]">
                    Purchased {selected.purchasedOn}
                    {selected.vendor ? ` from ${selected.vendor}` : ""}
                  </p>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--lifeos-ink-soft)]">Amount</dt>
                    <dd className="text-[var(--lifeos-ink)]">
                      {formatMoney(selected.amount, selected.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--lifeos-ink-soft)]">Receipt</dt>
                    <dd className="text-[var(--lifeos-ink)]">
                      {selected.receiptTitle ?? "None linked"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[var(--lifeos-ink-soft)]">Notes</dt>
                    <dd className="text-[var(--lifeos-ink)]">
                      {selected.notes ?? "—"}
                    </dd>
                  </div>
                </dl>

                <div className="rounded-xl border border-[var(--lifeos-border)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--lifeos-ink)]">
                        Warranty
                      </p>
                      <p className="mt-1 text-sm text-[var(--lifeos-ink-soft)]">
                        {warrantyStatusLabel(selected.warranty)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => beginWarrantyEdit(selected)}
                    >
                      {selected.warranty ? "Edit" : "Add"}
                    </Button>
                  </div>
                  {selected.warranty ? (
                    <dl className="mt-3 grid gap-2 text-sm">
                      <div>
                        <dt className="text-[var(--lifeos-ink-soft)]">
                          Provider
                        </dt>
                        <dd>{selected.warranty.provider ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--lifeos-ink-soft)]">
                          Period
                        </dt>
                        <dd>
                          {selected.warranty.startsOn ?? "—"} →{" "}
                          {selected.warranty.endsOn}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--lifeos-ink-soft)]">Terms</dt>
                        <dd>{selected.warranty.terms ?? "—"}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--lifeos-ink-soft)]">
                      No warranty recorded for this purchase.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => beginEdit(selected)}
                  >
                    Edit purchase
                  </Button>
                  {selected.warranty ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyId === selected.id}
                      onClick={() => void handleDeleteWarranty(selected.id)}
                    >
                      Remove warranty
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busyId === selected.id}
                    onClick={() => void handleDelete(selected.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--lifeos-ink-soft)]">
                Select a purchase to view details, warranty, and receipt link.
              </p>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
