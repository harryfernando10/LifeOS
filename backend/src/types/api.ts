export type ApiErrorBody = {
  error: string;
  code?: string;
};

export type HealthResponseBody = {
  status: "ok";
  service: "lifeos-backend";
};

export type ReadyResponseBody = {
  status: "ready" | "not_ready";
  service: "lifeos-backend";
  database: "up" | "down" | "unconfigured";
};

export type AuthUserResponseBody = {
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
};

export type DocumentVersionSummaryBody = {
  id: string;
  versionNumber: number;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  isCurrent: boolean;
  uploadedAt: string;
  replacedAt: string | null;
};

export type DocumentResponseBody = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  status: string;
  issuedOn: string | null;
  expiresOn: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: DocumentVersionSummaryBody | null;
};

export type SubscriptionResponseBody = {
  id: string;
  name: string;
  provider: string | null;
  amount: string | null;
  currency: string;
  billingInterval: string;
  nextBillingOn: string | null;
  status: string;
  actionUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecurringPaymentResponseBody = {
  id: string;
  name: string;
  payee: string | null;
  amount: string | null;
  currency: string;
  billingInterval: string;
  nextDueOn: string | null;
  status: string;
  actionUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WarrantyResponseBody = {
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

export type PurchaseResponseBody = {
  id: string;
  name: string;
  purchasedOn: string;
  amount: string | null;
  currency: string;
  vendor: string | null;
  notes: string | null;
  receiptDocumentId: string | null;
  receiptTitle: string | null;
  warranty: WarrantyResponseBody | null;
  createdAt: string;
  updatedAt: string;
};
