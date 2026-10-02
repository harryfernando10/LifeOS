import { ApiRequestError, apiRequest, getApiBaseUrl } from "./client";

export const DOCUMENT_CATEGORIES = [
  "PASSPORT",
  "NATIONAL_ID",
  "TAX_ID",
  "DRIVING_LICENCE",
  "EDUCATION_ID",
  "CERTIFICATE",
  "INSURANCE",
  "AGREEMENT",
  "INVOICE",
  "RECEIPT",
  "OTHER",
] as const;

export const DOCUMENT_STATUSES = ["ACTIVE", "EXPIRED", "ARCHIVED"] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export type DocumentVersionSummary = {
  id: string;
  versionNumber: number;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  isCurrent: boolean;
  uploadedAt: string;
  replacedAt: string | null;
};

export type VaultDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string | null;
  status: DocumentStatus;
  issuedOn: string | null;
  expiresOn: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: DocumentVersionSummary | null;
};

export type DocumentCreateInput = {
  title: string;
  category: DocumentCategory;
  description?: string;
  status?: DocumentStatus;
  issuedOn?: string;
  expiresOn?: string;
  notes?: string;
  file: File;
};

export type DocumentUpdateInput = {
  title?: string;
  category?: DocumentCategory;
  description?: string | null;
  status?: DocumentStatus;
  issuedOn?: string | null;
  expiresOn?: string | null;
  notes?: string | null;
};

type DocumentsResponse = { documents: VaultDocument[] };
type DocumentResponse = { document: VaultDocument };
type VersionsResponse = { versions: DocumentVersionSummary[] };
type VersionCreateResponse = {
  document: VaultDocument;
  version: DocumentVersionSummary;
};

export async function listDocuments(): Promise<VaultDocument[]> {
  const body = await apiRequest<DocumentsResponse>("/documents");
  return body.documents;
}

export async function getDocument(id: string): Promise<VaultDocument> {
  const body = await apiRequest<DocumentResponse>(`/documents/${id}`);
  return body.document;
}

export async function createDocument(
  input: DocumentCreateInput,
): Promise<VaultDocument> {
  const form = new FormData();
  form.set("title", input.title);
  form.set("category", input.category);
  if (input.status) {
    form.set("status", input.status);
  }
  if (input.description) {
    form.set("description", input.description);
  }
  if (input.issuedOn) {
    form.set("issuedOn", input.issuedOn);
  }
  if (input.expiresOn) {
    form.set("expiresOn", input.expiresOn);
  }
  if (input.notes) {
    form.set("notes", input.notes);
  }
  form.set("file", input.file);

  const body = await apiRequest<DocumentResponse>("/documents", {
    method: "POST",
    body: form,
  });
  return body.document;
}

export async function updateDocument(
  id: string,
  input: DocumentUpdateInput,
): Promise<VaultDocument> {
  const body = await apiRequest<DocumentResponse>(`/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return body.document;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiRequest<void>(`/documents/${id}`, { method: "DELETE" });
}

export async function listDocumentVersions(
  documentId: string,
): Promise<DocumentVersionSummary[]> {
  const body = await apiRequest<VersionsResponse>(
    `/documents/${documentId}/versions`,
  );
  return body.versions;
}

export async function createDocumentVersion(
  documentId: string,
  input: { file: File; notes?: string },
): Promise<VersionCreateResponse> {
  const form = new FormData();
  form.set("file", input.file);
  if (input.notes) {
    form.set("notes", input.notes);
  }

  return apiRequest<VersionCreateResponse>(
    `/documents/${documentId}/versions`,
    {
      method: "POST",
      body: form,
    },
  );
}

async function triggerBrowserDownload(response: Response): Promise<void> {
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? "document";

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function fetchDownload(path: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new ApiRequestError(
      "Unable to reach the server. Check that the backend is running.",
      0,
      "NETWORK_ERROR",
    );
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as {
        error?: string;
        code?: string;
      };
      throw new ApiRequestError(
        payload.error ?? "Download failed.",
        response.status,
        payload.code,
      );
    }
    throw new ApiRequestError("Download failed.", response.status);
  }

  await triggerBrowserDownload(response);
}

export async function downloadDocument(id: string): Promise<void> {
  await fetchDownload(`/documents/${id}/download`);
}

export async function downloadDocumentVersion(
  documentId: string,
  versionId: string,
): Promise<void> {
  await fetchDownload(
    `/documents/${documentId}/versions/${versionId}/download`,
  );
}

export function formatCategoryLabel(category: DocumentCategory): string {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}
