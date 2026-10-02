import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import {
  FileStorageService,
  setFileStorageServiceForTests,
} from "../services/fileStorageService.js";
import {
  assertSafeRelativeStorageKey,
  detectAllowedFileType,
  sanitizeOriginalFileName,
} from "../utils/fileValidation.js";

dotenv.config();

const TEST_EMAIL_A = `phase5-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = `phase5-b-${Date.now()}@example.com`;
const PASSWORD = "securepass1";

let server: Server;
let baseUrl: string;
let storageRoot: string;
let cookieA = "";
let cookieB = "";
let previousMaxUpload: string | undefined;

function extractSessionCookie(response: Response): string | null {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter((v): v is string => Boolean(v));

  for (const raw of setCookies) {
    const match = /(?:^|,\s*)lifeos\.sid=([^;]+)/.exec(raw);
    if (match) {
      return `lifeos.sid=${match[1]}`;
    }
  }
  return null;
}

async function api(
  pathName: string,
  init: RequestInit = {},
  cookie = cookieA,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${baseUrl}${pathName}`, { ...init, headers });
}

function makePdfBuffer(extraBytes = 0): Buffer {
  const header = Buffer.from("%PDF-1.4\n% LifeOS test document\n");
  if (extraBytes <= 0) {
    return header;
  }
  return Buffer.concat([header, Buffer.alloc(extraBytes, 0x41)]);
}

function makePngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

describe("Phase 5 vault documents", () => {
  before(async () => {
    previousMaxUpload = process.env.MAX_UPLOAD_BYTES;
    process.env.MAX_UPLOAD_BYTES = String(64 * 1024);

    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lifeos-vault-"));
    setFileStorageServiceForTests(new FileStorageService(storageRoot));

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind test server");
    }
    baseUrl = `http://127.0.0.1:${address.port}/api`;

    const registerA = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL_A, password: PASSWORD }),
    }, "");
    assert.equal(registerA.status, 201);
    cookieA = extractSessionCookie(registerA) ?? "";
    assert.ok(cookieA);

    const registerB = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL_B, password: PASSWORD }),
    }, "");
    assert.equal(registerB.status, 201);
    cookieB = extractSessionCookie(registerB) ?? "";
    assert.ok(cookieB);
  });

  after(async () => {
    if (previousMaxUpload === undefined) {
      delete process.env.MAX_UPLOAD_BYTES;
    } else {
      process.env.MAX_UPLOAD_BYTES = previousMaxUpload;
    }

    await prisma.user.deleteMany({
      where: { email: { in: [TEST_EMAIL_A, TEST_EMAIL_B] } },
    });

    setFileStorageServiceForTests(null);

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await prisma.$disconnect();
    await fs.rm(storageRoot, { recursive: true, force: true });
  });

  it("rejects unauthenticated document access", async () => {
    const response = await api("/documents", {}, "");
    assert.equal(response.status, 401);
  });

  it("creates and lists an owned document upload", async () => {
    const form = new FormData();
    form.set("title", "Test passport scan");
    form.set("category", "PASSPORT");
    form.set("status", "ACTIVE");
    form.set(
      "file",
      new Blob([makePdfBuffer()], { type: "application/pdf" }),
      "passport.pdf",
    );

    const createResponse = await api("/documents", {
      method: "POST",
      body: form,
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      document: {
        id: string;
        title: string;
        category: string;
        currentVersion: { versionNumber: number; mimeType: string } | null;
        storageKey?: string;
      };
    };
    assert.equal(created.document.title, "Test passport scan");
    assert.equal(created.document.category, "PASSPORT");
    assert.equal(created.document.currentVersion?.versionNumber, 1);
    assert.equal(created.document.currentVersion?.mimeType, "application/pdf");
    assert.equal(created.document.storageKey, undefined);

    const listResponse = await api("/documents");
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as {
      documents: Array<{ id: string }>;
    };
    assert.ok(listed.documents.some((doc) => doc.id === created.document.id));
  });

  it("retrieves and downloads an owned document", async () => {
    const form = new FormData();
    form.set("title", "Downloadable receipt");
    form.set("category", "RECEIPT");
    form.set(
      "file",
      new Blob([makePngBuffer()], { type: "image/png" }),
      "receipt.png",
    );

    const createResponse = await api("/documents", {
      method: "POST",
      body: form,
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      document: { id: string };
    };

    const getResponse = await api(`/documents/${created.document.id}`);
    assert.equal(getResponse.status, 200);
    const got = (await getResponse.json()) as {
      document: { id: string; title: string };
    };
    assert.equal(got.document.title, "Downloadable receipt");

    const download = await api(`/documents/${created.document.id}/download`);
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "image/png");
    const bytes = Buffer.from(await download.arrayBuffer());
    assert.ok(detectAllowedFileType(bytes)?.mimeType === "image/png");
  });

  it("blocks access to another user's document and file", async () => {
    const form = new FormData();
    form.set("title", "Owner only");
    form.set("category", "OTHER");
    form.set(
      "file",
      new Blob([makePdfBuffer()], { type: "application/pdf" }),
      "secret.pdf",
    );

    const createResponse = await api(
      "/documents",
      { method: "POST", body: form },
      cookieA,
    );
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      document: { id: string };
    };

    const getAsB = await api(
      `/documents/${created.document.id}`,
      {},
      cookieB,
    );
    assert.equal(getAsB.status, 404);

    const downloadAsB = await api(
      `/documents/${created.document.id}/download`,
      {},
      cookieB,
    );
    assert.equal(downloadAsB.status, 404);
  });

  it("rejects invalid upload input and oversized files", async () => {
    const missingFile = new FormData();
    missingFile.set("title", "No file");
    const missingResponse = await api("/documents", {
      method: "POST",
      body: missingFile,
    });
    assert.equal(missingResponse.status, 400);

    const badType = new FormData();
    badType.set("title", "Bad type");
    badType.set(
      "file",
      new Blob([Buffer.from("not-a-real-pdf")], { type: "application/pdf" }),
      "fake.pdf",
    );
    const badTypeResponse = await api("/documents", {
      method: "POST",
      body: badType,
    });
    assert.equal(badTypeResponse.status, 400);

    const oversized = new FormData();
    oversized.set("title", "Too big");
    oversized.set(
      "file",
      new Blob([makePdfBuffer(70 * 1024)], { type: "application/pdf" }),
      "big.pdf",
    );
    const oversizedResponse = await api("/documents", {
      method: "POST",
      body: oversized,
    });
    assert.equal(oversizedResponse.status, 400);
    const body = (await oversizedResponse.json()) as { code?: string };
    assert.equal(body.code, "FILE_TOO_LARGE");
  });

  it("prevents path-traversal storage keys and sanitizes filenames", () => {
    assert.throws(() => assertSafeRelativeStorageKey("../etc/passwd"));
    assert.throws(() => assertSafeRelativeStorageKey("user/../../secret"));
    assert.throws(() => assertSafeRelativeStorageKey("/abs/path"));

    const storage = new FileStorageService(storageRoot);
    assert.throws(() => storage.resolveAbsolutePath("../outside"));
    assert.throws(() =>
      storage.resolveAbsolutePath(`${randomUUID()}/../${randomUUID()}`),
    );

    assert.equal(
      sanitizeOriginalFileName("../../evil.pdf"),
      "evil.pdf",
    );
    assert.equal(
      sanitizeOriginalFileName("C:\\\\temp\\\\scan.png"),
      "scan.png",
    );
  });

  it("deletes document records and stored files", async () => {
    const form = new FormData();
    form.set("title", "Delete me");
    form.set("category", "OTHER");
    form.set(
      "file",
      new Blob([makePdfBuffer()], { type: "application/pdf" }),
      "delete-me.pdf",
    );

    const createResponse = await api("/documents", {
      method: "POST",
      body: form,
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      document: { id: string };
    };

    const version = await prisma.documentVersion.findFirst({
      where: { documentId: created.document.id, isCurrent: true },
    });
    assert.ok(version?.storageKey);
    const absolute = path.resolve(storageRoot, ...version.storageKey!.split("/"));
    await fs.access(absolute);

    const deleteResponse = await api(`/documents/${created.document.id}`, {
      method: "DELETE",
    });
    assert.equal(deleteResponse.status, 204);

    const missing = await prisma.document.findUnique({
      where: { id: created.document.id },
    });
    assert.equal(missing, null);

    await assert.rejects(async () => fs.access(absolute));
  });

  it("updates document metadata for the owner", async () => {
    const form = new FormData();
    form.set("title", "Before update");
    form.set("category", "OTHER");
    form.set(
      "file",
      new Blob([makePdfBuffer()], { type: "application/pdf" }),
      "meta.pdf",
    );

    const createResponse = await api("/documents", {
      method: "POST",
      body: form,
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      document: { id: string };
    };

    const updateResponse = await api(`/documents/${created.document.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "After update",
        status: "ARCHIVED",
        notes: "Phase 5 metadata test",
      }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()) as {
      document: { title: string; status: string; notes: string | null };
    };
    assert.equal(updated.document.title, "After update");
    assert.equal(updated.document.status, "ARCHIVED");
    assert.equal(updated.document.notes, "Phase 5 metadata test");
  });

  it("computes checksum for stored uploads", async () => {
    const payload = makePdfBuffer(32);
    const expected = createHash("sha256").update(payload).digest("hex");

    const form = new FormData();
    form.set("title", "Checksum doc");
    form.set("category", "OTHER");
    form.set(
      "file",
      new Blob([payload], { type: "application/pdf" }),
      "checksum.pdf",
    );

    const createResponse = await api("/documents", {
      method: "POST",
      body: form,
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      document: { id: string };
    };

    const version = await prisma.documentVersion.findFirst({
      where: { documentId: created.document.id, isCurrent: true },
    });
    assert.equal(version?.checksumSha256, expected);
  });
});
