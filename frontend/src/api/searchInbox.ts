import { apiRequest, getApiBaseUrl } from "./client";

export type SearchResult = { id: string; type: string; title: string; detail: string | null; href: string; updatedAt: string };
export async function searchLife(query: string): Promise<SearchResult[]> {
  const data = await apiRequest<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}`);
  return data.results;
}

export type InboxStatus = "UNREVIEWED" | "CATEGORIZED" | "DISMISSED";
export type InboxItem = { id: string; title: string | null; notes: string | null; status: InboxStatus; originalFileName: string | null; mimeType: string | null; sizeBytes: number | null; createdAt: string; updatedAt: string; linkedDocumentId: string | null; linkedDocument: { id: string; title: string } | null };
export async function listInbox(status?: InboxStatus): Promise<InboxItem[]> {
  const data = await apiRequest<{ items: InboxItem[] }>(`/inbox${status ? `?status=${status}` : ""}`);
  return data.items;
}
export async function createInbox(input: { title?: string; notes?: string; linkedDocumentId?: string; file?: File }): Promise<InboxItem> {
  let body: BodyInit;
  if (input.file) { const form = new FormData(); if (input.title) form.set("title", input.title); if (input.notes) form.set("notes", input.notes); if (input.linkedDocumentId) form.set("linkedDocumentId", input.linkedDocumentId); form.set("file", input.file); body = form; }
  else body = JSON.stringify(input);
  const data = await apiRequest<{ item: InboxItem }>("/inbox", { method: "POST", body }); return data.item;
}
export async function updateInbox(id: string, input: Partial<{ title: string; notes: string | null; linkedDocumentId: string | null; status: InboxStatus }>): Promise<InboxItem> {
  const data = await apiRequest<{ item: InboxItem }>(`/inbox/${id}`, { method: "PATCH", body: JSON.stringify(input) }); return data.item;
}
export async function triageInbox(id: string, status: InboxStatus): Promise<InboxItem> {
  const data = await apiRequest<{ item: InboxItem }>(`/inbox/${id}/triage`, { method: "PATCH", body: JSON.stringify({ status }) }); return data.item;
}
export async function deleteInbox(id: string): Promise<void> { await apiRequest<void>(`/inbox/${id}`, { method: "DELETE" }); }
export async function downloadInboxFile(id: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/inbox/${id}/download`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to download Inbox attachment.");
  const blob = await response.blob(); const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "inbox-file";
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}
