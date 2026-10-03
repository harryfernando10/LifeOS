import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { FileStorageService, setFileStorageServiceForTests } from "../services/fileStorageService.js";
import { parseAIProcessResponse } from "../validators/aiValidators.js";

dotenv.config();
const emailA = `phase14-ai-a-${Date.now()}@example.com`;
const emailB = `phase14-ai-b-${Date.now()}@example.com`;
const password = "securepass1";
const originalFetch = globalThis.fetch;
const originalServiceUrl = process.env.AI_SERVICE_URL;
const originalServiceToken = process.env.AI_SERVICE_TOKEN;
let server: Server;
let base = "";
let cookieA = "";
let cookieB = "";
let userA = "";
let tempRoot = "";

function session(response: Response) {
  const value = response.headers.get("set-cookie") ?? "";
  const match = /lifeos\.sid=([^;]+)/.exec(value);
  return match ? `lifeos.sid=${match[1]}` : "";
}

async function api(route: string, init: RequestInit = {}, cookie = cookieA) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return originalFetch(`${base}${route}`, { ...init, headers });
}

async function uploadInbox() {
  const form = new FormData();
  form.set("file", new Blob([Buffer.from("%PDF-1.7 phase14 fixture")], { type: "application/pdf" }), "synthetic-receipt.pdf");
  const response = await api("/inbox", { method: "POST", body: form });
  assert.equal(response.status, 201);
  return (await response.json() as { item: { id: string } }).item.id;
}

const providerResponse = {
  extractedText: "Synthetic Store receipt. Total INR 125.50, 2026-09-01.",
  textSource: "pdf-text",
  externalProviderUsed: true,
  suggestion: {
    kind: "receipt", category: "RECEIPT", title: "Receipt", issuedOn: null, expiresOn: null,
    description: null, name: "Sample item", purchasedOn: "2026-09-01", amount: "125.50", currency: "INR",
    vendor: "Synthetic Store", notes: null, warrantyProvider: null, warrantyStartsOn: null,
    warrantyEndsOn: null, warrantyTerms: null,
  },
};

describe("Phase 14 AI intelligence boundary", () => {
  before(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "lifeos-ai-test-"));
    setFileStorageServiceForTests(new FileStorageService(tempRoot));
    const app = createApp();
    await new Promise<void>(resolve => { server = app.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test server address");
    base = `http://127.0.0.1:${address.port}/api`;
    const a = await api("/auth/register", { method: "POST", body: JSON.stringify({ email: emailA, password }) }, "");
    assert.equal(a.status, 201); cookieA = session(a); userA = ((await a.json()) as { user: { id: string } }).user.id;
    const b = await api("/auth/register", { method: "POST", body: JSON.stringify({ email: emailB, password }) }, "");
    assert.equal(b.status, 201); cookieB = session(b);
    process.env.AI_SERVICE_URL = "https://ai-service.test";
    process.env.AI_SERVICE_TOKEN = "mock-service-token";
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    if (originalServiceUrl === undefined) delete process.env.AI_SERVICE_URL; else process.env.AI_SERVICE_URL = originalServiceUrl;
    if (originalServiceToken === undefined) delete process.env.AI_SERVICE_TOKEN; else process.env.AI_SERVICE_TOKEN = originalServiceToken;
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
    setFileStorageServiceForTests(null);
    await rm(tempRoot, { recursive: true, force: true });
  });

  it("requires authentication and refuses cross-user file processing", async () => {
    const id = await uploadInbox();
    assert.equal((await api(`/ai/inbox/${id}/process`, { method: "POST" }, "")).status, 401);
    let calls = 0;
    globalThis.fetch = async () => { calls += 1; return new Response(JSON.stringify(providerResponse)); };
    const foreign = await api(`/ai/inbox/${id}/process`, { method: "POST" }, cookieB);
    assert.equal(foreign.status, 404);
    assert.equal(calls, 0);
  });

  it("fails clearly when AI service configuration is missing", async () => {
    const id = await uploadInbox();
    delete process.env.AI_SERVICE_URL;
    const response = await api(`/ai/inbox/${id}/process`, { method: "POST" });
    assert.equal(response.status, 503);
    assert.match((await response.json() as { error: string }).error, /AI processing is unavailable/);
    process.env.AI_SERVICE_URL = "https://ai-service.test";
  });

  it("returns validated mocked suggestions without mutating domain data", async () => {
    const id = await uploadInbox();
    globalThis.fetch = async (_input, init) => {
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer mock-service-token");
      return new Response(JSON.stringify(providerResponse), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const response = await api(`/ai/inbox/${id}/process`, { method: "POST" });
    assert.equal(response.status, 200);
    const body = await response.json() as { result: typeof providerResponse; };
    assert.equal(body.result.suggestion.amount, "125.50");
    assert.equal((body.result as typeof providerResponse & { storageKey?: string }).storageKey, undefined);
    assert.equal((await prisma.purchase.count({ where: { userId: userA } })), 0);
    assert.equal((await prisma.document.count({ where: { userId: userA } })), 0);
  });

  it("rejects malformed AI output at the backend contract boundary", async () => {
    const id = await uploadInbox();
    globalThis.fetch = async () => new Response(JSON.stringify({ ...providerResponse, suggestion: { ...providerResponse.suggestion, category: "MADE_UP" } }), { status: 200 });
    const response = await api(`/ai/inbox/${id}/process`, { method: "POST" });
    assert.equal(response.status, 502);
    assert.equal((await response.json() as { code: string }).code, "AI_INVALID_RESPONSE");
    assert.throws(() => parseAIProcessResponse({ ...providerResponse, suggestion: { ...providerResponse.suggestion, amount: "-1" } }));
  });

  it("confirms a document through Vault domain logic, then a purchase through purchase logic", async () => {
    const id = await uploadInbox();
    const documentResponse = await api(`/ai/inbox/${id}/confirm-document`, {
      method: "POST", body: JSON.stringify({ title: "Synthetic receipt", category: "RECEIPT", issuedOn: "2026-09-01" }),
    });
    assert.equal(documentResponse.status, 201);
    const documentId = (await documentResponse.json() as { document: { id: string; category: string } }).document.id;
    const linked = await prisma.inboxItem.findFirst({ where: { id, userId: userA }, select: { linkedDocumentId: true } });
    assert.equal(linked?.linkedDocumentId, documentId);
    const purchaseResponse = await api("/purchases", { method: "POST", body: JSON.stringify({ name: "Sample item", purchasedOn: "2026-09-01", amount: "125.50", currency: "INR", vendor: "Synthetic Store", receiptDocumentId: documentId }) });
    assert.equal(purchaseResponse.status, 201);
    const purchase = (await purchaseResponse.json() as { purchase: { receiptDocumentId: string } }).purchase;
    assert.equal(purchase.receiptDocumentId, documentId);
  });

  it("does not require or invent a warranty period", async () => {
    const result = parseAIProcessResponse(providerResponse);
    assert.equal(result.suggestion.warrantyEndsOn, null);
    assert.equal(await prisma.warranty.count({ where: { userId: userA } }), 0);
  });

  it("keeps an explicitly stated warranty date as a suggestion until normal confirmation", async () => {
    const explicit = parseAIProcessResponse({
      ...providerResponse,
      suggestion: { ...providerResponse.suggestion, warrantyProvider: "Synthetic Maker", warrantyStartsOn: "2026-09-01", warrantyEndsOn: "2027-09-01", warrantyTerms: "One year as printed" },
    });
    assert.equal(explicit.suggestion.warrantyEndsOn, "2027-09-01");
    assert.equal(await prisma.warranty.count({ where: { userId: userA } }), 0);
    const purchaseResponse = await api("/purchases", { method: "POST", body: JSON.stringify({ name: "Warranty sample", purchasedOn: "2026-09-01" }) });
    const purchaseId = (await purchaseResponse.json() as { purchase: { id: string } }).purchase.id;
    const confirmed = await api(`/purchases/${purchaseId}/warranty`, { method: "PUT", body: JSON.stringify({ provider: explicit.suggestion.warrantyProvider, startsOn: explicit.suggestion.warrantyStartsOn, endsOn: explicit.suggestion.warrantyEndsOn, terms: explicit.suggestion.warrantyTerms }) });
    assert.equal(confirmed.status, 200);
    assert.equal((await confirmed.json() as { purchase: { warranty: { endsOn: string } } }).purchase.warranty.endsOn, "2027-09-01");
  });

  it("scopes document processing to the document owner", async () => {
    const document = await prisma.document.create({ data: { userId: userA, title: "Private", category: "OTHER" } });
    assert.equal((await api(`/ai/documents/${document.id}/process`, { method: "POST" }, cookieB)).status, 404);
    const inboxId = await uploadInbox();
    const confirmed = await api(`/ai/inbox/${inboxId}/confirm-document`, { method: "POST", body: JSON.stringify({ title: "Owned receipt", category: "RECEIPT" }) });
    const ownedDocumentId = (await confirmed.json() as { document: { id: string } }).document.id;
    globalThis.fetch = async () => new Response(JSON.stringify(providerResponse), { status: 200 });
    assert.equal((await api(`/ai/documents/${ownedDocumentId}/process`, { method: "POST" })).status, 200);
  });
});
