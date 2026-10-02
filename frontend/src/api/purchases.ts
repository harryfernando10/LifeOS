import { apiRequest } from "./client";

export type Warranty = {
  id: string;
  purchaseId: string;
  provider: string | null;
  startsOn: string | null;
  endsOn: string;
  terms: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Purchase = {
  id: string;
  name: string;
  purchasedOn: string;
  amount: string | null;
  currency: string;
  vendor: string | null;
  notes: string | null;
  receiptDocumentId: string | null;
  receiptTitle: string | null;
  warranty: Warranty | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseInput = {
  name: string;
  purchasedOn: string;
  amount?: string | null;
  currency?: string;
  vendor?: string | null;
  notes?: string | null;
  receiptDocumentId?: string | null;
};

export type WarrantyInput = {
  provider?: string | null;
  startsOn?: string | null;
  endsOn: string;
  terms?: string | null;
  notes?: string | null;
};

export async function listPurchases(): Promise<Purchase[]> {
  const body = await apiRequest<{ purchases: Purchase[] }>("/purchases");
  return body.purchases;
}

export async function createPurchase(input: PurchaseInput): Promise<Purchase> {
  const body = await apiRequest<{ purchase: Purchase }>("/purchases", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.purchase;
}

export async function updatePurchase(
  id: string,
  input: Partial<PurchaseInput>,
): Promise<Purchase> {
  const body = await apiRequest<{ purchase: Purchase }>(`/purchases/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return body.purchase;
}

export async function deletePurchase(id: string): Promise<void> {
  await apiRequest<void>(`/purchases/${id}`, { method: "DELETE" });
}

export async function upsertWarranty(
  purchaseId: string,
  input: WarrantyInput,
): Promise<Purchase> {
  const body = await apiRequest<{ purchase: Purchase }>(
    `/purchases/${purchaseId}/warranty`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return body.purchase;
}

export async function deleteWarranty(purchaseId: string): Promise<Purchase> {
  const body = await apiRequest<{ purchase: Purchase }>(
    `/purchases/${purchaseId}/warranty`,
    { method: "DELETE" },
  );
  return body.purchase;
}

export function formatMoney(
  amount: string | null,
  currency: string,
): string {
  if (amount == null) {
    return "—";
  }
  return `${currency} ${amount}`;
}

export function warrantyStatusLabel(
  warranty: Warranty | null,
  today = new Date(),
): string {
  if (!warranty) {
    return "No warranty";
  }
  const ends = new Date(`${warranty.endsOn}T00:00:00.000Z`);
  if (Number.isNaN(ends.getTime())) {
    return "Warranty";
  }
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  if (ends.getTime() < todayUtc) {
    return "Expired";
  }
  return "Active";
}
