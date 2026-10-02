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
