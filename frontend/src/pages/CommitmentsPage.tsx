import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BILLING_INTERVALS,
  COMMITMENT_STATUSES,
  createRecurringPayment,
  createSubscription,
  deleteRecurringPayment,
  deleteSubscription,
  formatBillingInterval,
  formatMoney,
  formatStatusLabel,
  listRecurringPayments,
  listSubscriptions,
  updateRecurringPayment,
  updateSubscription,
  type BillingInterval,
  type CommitmentStatus,
  type RecurringPayment,
  type Subscription,
} from "../api/commitments";
import { ApiRequestError } from "../api/client";
import { PurchasesPanel } from "../components/PurchasesPanel";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";

type CommitmentTab = "subscriptions" | "payments" | "purchases";

type SubscriptionFormState = {
  name: string;
  provider: string;
  amount: string;
  currency: string;
  billingInterval: BillingInterval;
  nextBillingOn: string;
  status: CommitmentStatus;
  actionUrl: string;
  notes: string;
};

type PaymentFormState = {
  name: string;
  payee: string;
  amount: string;
  currency: string;
  billingInterval: BillingInterval;
  nextDueOn: string;
  status: CommitmentStatus;
  actionUrl: string;
  notes: string;
};

const emptySubscriptionForm: SubscriptionFormState = {
  name: "",
  provider: "",
  amount: "",
  currency: "INR",
  billingInterval: "MONTHLY",
  nextBillingOn: "",
  status: "ACTIVE",
  actionUrl: "",
  notes: "",
};

const emptyPaymentForm: PaymentFormState = {
  name: "",
  payee: "",
  amount: "",
  currency: "INR",
  billingInterval: "MONTHLY",
  nextDueOn: "",
  status: "ACTIVE",
  actionUrl: "",
  notes: "",
};

function fieldClassName(): string {
  return "w-full rounded-lg border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)] px-3.5 py-2.5 text-[var(--lifeos-ink)] outline-none transition focus:border-[var(--lifeos-accent)] focus:ring-2 focus:ring-[var(--lifeos-accent-soft)]";
}

function optionalOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function CommitmentsPage() {
  const [tab, setTab] = useState<CommitmentTab>("subscriptions");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState(emptySubscriptionForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<
    string | null
  >(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );

  const selectedSubscription =
    subscriptions.find((item) => item.id === selectedSubscriptionId) ?? null;
  const selectedPayment =
    payments.find((item) => item.id === selectedPaymentId) ?? null;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, pays] = await Promise.all([
        listSubscriptions(),
        listRecurringPayments(),
      ]);
      setSubscriptions(subs);
      setPayments(pays);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to load commitments.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function resetForms() {
    setSubscriptionForm(emptySubscriptionForm);
    setPaymentForm(emptyPaymentForm);
    setEditingId(null);
    setShowForm(false);
  }

  function beginCreate() {
    resetForms();
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function beginEditSubscription(item: Subscription) {
    setTab("subscriptions");
    setEditingId(item.id);
    setSelectedSubscriptionId(item.id);
    setSubscriptionForm({
      name: item.name,
      provider: item.provider ?? "",
      amount: item.amount ?? "",
      currency: item.currency,
      billingInterval: item.billingInterval,
      nextBillingOn: item.nextBillingOn ?? "",
      status: item.status,
      actionUrl: item.actionUrl ?? "",
      notes: item.notes ?? "",
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function beginEditPayment(item: RecurringPayment) {
    setTab("payments");
    setEditingId(item.id);
    setSelectedPaymentId(item.id);
    setPaymentForm({
      name: item.name,
      payee: item.payee ?? "",
      amount: item.amount ?? "",
      currency: item.currency,
      billingInterval: item.billingInterval,
      nextDueOn: item.nextDueOn ?? "",
      status: item.status,
      actionUrl: item.actionUrl ?? "",
      notes: item.notes ?? "",
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  async function handleSubscriptionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: subscriptionForm.name.trim(),
        provider: optionalOrNull(subscriptionForm.provider),
        amount: optionalOrNull(subscriptionForm.amount),
        currency: subscriptionForm.currency.trim().toUpperCase() || "INR",
        billingInterval: subscriptionForm.billingInterval,
        nextBillingOn: optionalOrNull(subscriptionForm.nextBillingOn),
        status: subscriptionForm.status,
        actionUrl: optionalOrNull(subscriptionForm.actionUrl),
        notes: optionalOrNull(subscriptionForm.notes),
      };

      if (editingId) {
        const updated = await updateSubscription(editingId, payload);
        setSubscriptions((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSelectedSubscriptionId(updated.id);
        setSuccess("Subscription updated.");
      } else {
        const created = await createSubscription(payload);
        setSubscriptions((current) => [created, ...current]);
        setSelectedSubscriptionId(created.id);
        setSuccess("Subscription created.");
      }
      resetForms();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to save subscription.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: paymentForm.name.trim(),
        payee: optionalOrNull(paymentForm.payee),
        amount: optionalOrNull(paymentForm.amount),
        currency: paymentForm.currency.trim().toUpperCase() || "INR",
        billingInterval: paymentForm.billingInterval,
        nextDueOn: optionalOrNull(paymentForm.nextDueOn),
        status: paymentForm.status,
        actionUrl: optionalOrNull(paymentForm.actionUrl),
        notes: optionalOrNull(paymentForm.notes),
      };

      if (editingId) {
        const updated = await updateRecurringPayment(editingId, payload);
        setPayments((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSelectedPaymentId(updated.id);
        setSuccess("Recurring payment updated.");
      } else {
        const created = await createRecurringPayment(payload);
        setPayments((current) => [created, ...current]);
        setSelectedPaymentId(created.id);
        setSuccess("Recurring payment created.");
      }
      resetForms();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to save recurring payment.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSubscription(id: string) {
    const confirmed = window.confirm("Delete this subscription?");
    if (!confirmed) {
      return;
    }
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await deleteSubscription(id);
      setSubscriptions((current) => current.filter((item) => item.id !== id));
      if (selectedSubscriptionId === id) {
        setSelectedSubscriptionId(null);
      }
      if (editingId === id) {
        resetForms();
      }
      setSuccess("Subscription deleted.");
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

  async function handleDeletePayment(id: string) {
    const confirmed = window.confirm("Delete this recurring payment?");
    if (!confirmed) {
      return;
    }
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await deleteRecurringPayment(id);
      setPayments((current) => current.filter((item) => item.id !== id));
      if (selectedPaymentId === id) {
        setSelectedPaymentId(null);
      }
      if (editingId === id) {
        resetForms();
      }
      setSuccess("Recurring payment deleted.");
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

  const isEmpty =
    !loading && subscriptions.length === 0 && payments.length === 0;

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Commitments"
          description="Subscriptions, recurring payments, memberships, and purchases. Action URLs open externally — LifeOS does not process payments."
        />
        {tab !== "purchases" ? (
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
            {showForm && !editingId
              ? "Close form"
              : tab === "subscriptions"
                ? "Add subscription"
                : "Add recurring payment"}
          </Button>
        ) : null}
      </div>

      {tab !== "purchases" && error ? (
        <p className="text-sm text-[var(--lifeos-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {tab !== "purchases" && success ? (
        <p className="text-sm text-[var(--lifeos-accent)]" role="status">
          {success}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "subscriptions" ? "primary" : "secondary"}
          onClick={() => {
            setTab("subscriptions");
            setShowForm(false);
            setEditingId(null);
          }}
        >
          Subscriptions ({subscriptions.length})
        </Button>
        <Button
          type="button"
          variant={tab === "payments" ? "primary" : "secondary"}
          onClick={() => {
            setTab("payments");
            setShowForm(false);
            setEditingId(null);
          }}
        >
          Recurring payments ({payments.length})
        </Button>
        <Button
          type="button"
          variant={tab === "purchases" ? "primary" : "secondary"}
          onClick={() => {
            setTab("purchases");
            setShowForm(false);
            setEditingId(null);
          }}
        >
          Purchases
        </Button>
      </div>

      {tab === "purchases" ? <PurchasesPanel /> : null}

      {tab !== "purchases" && showForm ? (
        tab === "subscriptions" ? (
          <form
            onSubmit={handleSubscriptionSubmit}
            className="space-y-4 rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-5"
          >
            <h2 className="text-lg font-semibold text-[var(--lifeos-ink)]">
              {editingId ? "Edit subscription" : "Add subscription"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                required
                value={subscriptionForm.name}
                onChange={(event) =>
                  setSubscriptionForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Gym membership"
              />
              <Input
                label="Provider"
                value={subscriptionForm.provider}
                onChange={(event) =>
                  setSubscriptionForm((current) => ({
                    ...current,
                    provider: event.target.value,
                  }))
                }
              />
              <Input
                label="Amount"
                value={subscriptionForm.amount}
                onChange={(event) =>
                  setSubscriptionForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="499.00"
              />
              <Input
                label="Currency"
                value={subscriptionForm.currency}
                onChange={(event) =>
                  setSubscriptionForm((current) => ({
                    ...current,
                    currency: event.target.value,
                  }))
                }
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                  Billing interval
                </span>
                <select
                  className={fieldClassName()}
                  value={subscriptionForm.billingInterval}
                  onChange={(event) =>
                    setSubscriptionForm((current) => ({
                      ...current,
                      billingInterval: event.target.value as BillingInterval,
                    }))
                  }
                >
                  {BILLING_INTERVALS.map((interval) => (
                    <option key={interval} value={interval}>
                      {formatBillingInterval(interval)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Next billing on"
                type="date"
                value={subscriptionForm.nextBillingOn}
                onChange={(event) =>
                  setSubscriptionForm((current) => ({
                    ...current,
                    nextBillingOn: event.target.value,
                  }))
                }
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                  Status
                </span>
                <select
                  className={fieldClassName()}
                  value={subscriptionForm.status}
                  onChange={(event) =>
                    setSubscriptionForm((current) => ({
                      ...current,
                      status: event.target.value as CommitmentStatus,
                    }))
                  }
                >
                  {COMMITMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Action URL"
                value={subscriptionForm.actionUrl}
                onChange={(event) =>
                  setSubscriptionForm((current) => ({
                    ...current,
                    actionUrl: event.target.value,
                  }))
                }
                placeholder="https://…"
                hint="Opens externally; LifeOS does not complete the payment."
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                Notes
              </span>
              <textarea
                className={`${fieldClassName()} min-h-20`}
                value={subscriptionForm.notes}
                onChange={(event) =>
                  setSubscriptionForm((current) => ({
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
        ) : (
          <form
            onSubmit={handlePaymentSubmit}
            className="space-y-4 rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-5"
          >
            <h2 className="text-lg font-semibold text-[var(--lifeos-ink)]">
              {editingId ? "Edit recurring payment" : "Add recurring payment"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                required
                value={paymentForm.name}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Rent"
              />
              <Input
                label="Payee"
                value={paymentForm.payee}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    payee: event.target.value,
                  }))
                }
              />
              <Input
                label="Amount"
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="25000.00"
              />
              <Input
                label="Currency"
                value={paymentForm.currency}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    currency: event.target.value,
                  }))
                }
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                  Billing interval
                </span>
                <select
                  className={fieldClassName()}
                  value={paymentForm.billingInterval}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      billingInterval: event.target.value as BillingInterval,
                    }))
                  }
                >
                  {BILLING_INTERVALS.map((interval) => (
                    <option key={interval} value={interval}>
                      {formatBillingInterval(interval)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Next due on"
                type="date"
                value={paymentForm.nextDueOn}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    nextDueOn: event.target.value,
                  }))
                }
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                  Status
                </span>
                <select
                  className={fieldClassName()}
                  value={paymentForm.status}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      status: event.target.value as CommitmentStatus,
                    }))
                  }
                >
                  {COMMITMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Action URL"
                value={paymentForm.actionUrl}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    actionUrl: event.target.value,
                  }))
                }
                placeholder="https://…"
                hint="Opens externally; LifeOS does not complete the payment."
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
                Notes
              </span>
              <textarea
                className={`${fieldClassName()} min-h-20`}
                value={paymentForm.notes}
                onChange={(event) =>
                  setPaymentForm((current) => ({
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
        )
      ) : null}

      {tab !== "purchases" && loading ? (
        <p className="text-sm text-[var(--lifeos-muted)]">Loading commitments…</p>
      ) : tab !== "purchases" && isEmpty && !showForm ? (
        <div className="rounded-2xl border border-dashed border-[var(--lifeos-border)] bg-white/50 px-5 py-10">
          <p className="text-sm font-medium text-[var(--lifeos-ink-soft)]">
            No commitments yet
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--lifeos-muted)]">
            Track subscriptions and recurring payments here. Memberships can be
            recorded as either type.
          </p>
          <Button type="button" className="mt-5" onClick={beginCreate}>
            Add commitment
          </Button>
        </div>
      ) : tab === "subscriptions" ? (        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <ul className="divide-y divide-[var(--lifeos-border)] overflow-hidden rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90">
            {subscriptions.length === 0 ? (
              <li className="px-4 py-8 text-sm text-[var(--lifeos-muted)]">
                No subscriptions yet.
              </li>
            ) : (
              subscriptions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={[
                      "flex w-full flex-col gap-1 px-4 py-4 text-left transition",
                      item.id === selectedSubscriptionId
                        ? "bg-[var(--lifeos-accent-soft)]"
                        : "hover:bg-white/80",
                    ].join(" ")}
                    onClick={() => setSelectedSubscriptionId(item.id)}
                  >
                    <span className="text-sm font-semibold text-[var(--lifeos-ink)]">
                      {item.name}
                    </span>
                    <span className="text-xs text-[var(--lifeos-muted)]">
                      {formatStatusLabel(item.status)} ·{" "}
                      {formatBillingInterval(item.billingInterval)} ·{" "}
                      {formatMoney(item.amount, item.currency)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-5">
            {selectedSubscription ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-[var(--lifeos-ink)]">
                  {selectedSubscription.name}
                </h2>
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Provider</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {selectedSubscription.provider ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Amount</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {formatMoney(
                        selectedSubscription.amount,
                        selectedSubscription.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Next billing</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {selectedSubscription.nextBillingOn ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Status</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {formatStatusLabel(selectedSubscription.status)}
                    </dd>
                  </div>
                  {selectedSubscription.notes ? (
                    <div>
                      <dt className="text-[var(--lifeos-muted)]">Notes</dt>
                      <dd className="text-[var(--lifeos-ink-soft)]">
                        {selectedSubscription.notes}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <div className="flex flex-wrap gap-3 border-t border-[var(--lifeos-border)] pt-4">
                  {selectedSubscription.actionUrl ? (
                    <a
                      href={selectedSubscription.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg bg-[var(--lifeos-accent)] px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Open action URL
                    </a>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => beginEditSubscription(selectedSubscription)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--lifeos-danger)]"
                    disabled={busyId === selectedSubscription.id}
                    onClick={() => {
                      void handleDeleteSubscription(selectedSubscription.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--lifeos-muted)]">
                Select a subscription to view details.
              </p>
            )}
          </div>
        </div>
      ) : tab === "payments" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <ul className="divide-y divide-[var(--lifeos-border)] overflow-hidden rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90">
            {payments.length === 0 ? (
              <li className="px-4 py-8 text-sm text-[var(--lifeos-muted)]">
                No recurring payments yet.
              </li>
            ) : (
              payments.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={[
                      "flex w-full flex-col gap-1 px-4 py-4 text-left transition",
                      item.id === selectedPaymentId
                        ? "bg-[var(--lifeos-accent-soft)]"
                        : "hover:bg-white/80",
                    ].join(" ")}
                    onClick={() => setSelectedPaymentId(item.id)}
                  >
                    <span className="text-sm font-semibold text-[var(--lifeos-ink)]">
                      {item.name}
                    </span>
                    <span className="text-xs text-[var(--lifeos-muted)]">
                      {formatStatusLabel(item.status)} ·{" "}
                      {formatBillingInterval(item.billingInterval)} ·{" "}
                      {formatMoney(item.amount, item.currency)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-5">
            {selectedPayment ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-[var(--lifeos-ink)]">
                  {selectedPayment.name}
                </h2>
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Payee</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {selectedPayment.payee ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Amount</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {formatMoney(
                        selectedPayment.amount,
                        selectedPayment.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Next due</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {selectedPayment.nextDueOn ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--lifeos-muted)]">Status</dt>
                    <dd className="font-medium text-[var(--lifeos-ink)]">
                      {formatStatusLabel(selectedPayment.status)}
                    </dd>
                  </div>
                  {selectedPayment.notes ? (
                    <div>
                      <dt className="text-[var(--lifeos-muted)]">Notes</dt>
                      <dd className="text-[var(--lifeos-ink-soft)]">
                        {selectedPayment.notes}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <div className="flex flex-wrap gap-3 border-t border-[var(--lifeos-border)] pt-4">
                  {selectedPayment.actionUrl ? (
                    <a
                      href={selectedPayment.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg bg-[var(--lifeos-accent)] px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Open action URL
                    </a>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => beginEditPayment(selectedPayment)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--lifeos-danger)]"
                    disabled={busyId === selectedPayment.id}
                    onClick={() => {
                      void handleDeletePayment(selectedPayment.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--lifeos-muted)]">
                Select a recurring payment to view details.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
