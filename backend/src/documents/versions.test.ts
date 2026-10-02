import assert from "node:assert/strict";
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
import { detectAllowedFileType } from "../utils/fileValidation.js";

dotenv.config();

const TEST_EMAIL_A = `phase6-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = `phase6-b-${Date.now()}@example.com`;
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
  const header = Buffer.from("%PDF-1.4\n% LifeOS version test\n");
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

async function createOwnedDocument(
  title: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  cookie = cookieA,
): Promise<string> {
  const form = new FormData();
  form.set("title", title);
  form.set("category", "OTHER");
  form.set("file", new Blob([fileBuffer], { type: mimeType }), fileName);
  const response = await api("/documents", { method: "POST", body: form }, cookie);
  assert.equal(response.status, 201);
  const body = (await response.json()) as { document: { id: string } };
  return body.document.id;
}

describe("Phase 6 document versioning", () => {
  before(async () => {
    previousMaxUpload = process.env.MAX_UPLOAD_BYTES;
    process.env.MAX_UPLOAD_BYTES = String(64 * 1024);

    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lifeos-versions-"));
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

    const registerA = await api(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email: TEST_EMAIL_A, password: PASSWORD }),
      },
      "",
    );
    assert.equal(registerA.status, 201);
    cookieA = extractSessionCookie(registerA) ?? "";
    assert.ok(cookieA);

    const registerB = await api(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email: TEST_EMAIL_B, password: PASSWORD }),
      },
      "",
    );
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

  it("rejects unauthenticated version access", async () => {
    const response = await api("/documents/fake-id/versions", {}, "");
    assert.equal(response.status, 401);
  });

  it("creates a new version and lists history for the owner", async () => {
    const documentId = await createOwnedDocument(
      "Versioned contract",
      makePdfBuffer(),
      "v1.pdf",
      "application/pdf",
    );

    const replaceForm = new FormData();
    replaceForm.set(
      "file",
      new Blob([makePngBuffer()], { type: "image/png" }),
      "v2.png",
    );
    replaceForm.set("notes", "Replaced with clearer scan");

    const createVersion = await api(`/documents/${documentId}/versions`, {
      method: "POST",
      body: replaceForm,
    });
    assert.equal(createVersion.status, 201);
    const created = (await createVersion.json()) as {
      document: {
        id: string;
        currentVersion: { versionNumber: number; mimeType: string } | null;
      };
      version: {
        versionNumber: number;
        isCurrent: boolean;
        originalFileName: string | null;
      };
    };
    assert.equal(created.version.versionNumber, 2);
    assert.equal(created.version.isCurrent, true);
    assert.equal(created.document.currentVersion?.versionNumber, 2);
    assert.equal(created.document.currentVersion?.mimeType, "image/png");

    const listResponse = await api(`/documents/${documentId}/versions`);
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as {
      versions: Array<{
        versionNumber: number;
        isCurrent: boolean;
        replacedAt: string | null;
        storageKey?: string;
      }>;
    };
    assert.equal(listed.versions.length, 2);
    assert.equal(listed.versions[0]?.versionNumber, 2);
    assert.equal(listed.versions[0]?.isCurrent, true);
    assert.equal(listed.versions[1]?.versionNumber, 1);
    assert.equal(listed.versions[1]?.isCurrent, false);
    assert.ok(listed.versions[1]?.replacedAt);
    assert.equal(listed.versions[0]?.storageKey, undefined);
  });

  it("downloads a specific prior version without losing the file", async () => {
    const documentId = await createOwnedDocument(
      "Downloadable history",
      makePdfBuffer(8),
      "old.pdf",
      "application/pdf",
    );

    const v1 = await prisma.documentVersion.findFirst({
      where: { documentId, versionNumber: 1 },
    });
    assert.ok(v1?.storageKey);

    const replaceForm = new FormData();
    replaceForm.set(
      "file",
      new Blob([makePngBuffer()], { type: "image/png" }),
      "new.png",
    );
    const createVersion = await api(`/documents/${documentId}/versions`, {
      method: "POST",
      body: replaceForm,
    });
    assert.equal(createVersion.status, 201);

    const downloadV1 = await api(
      `/documents/${documentId}/versions/${v1!.id}/download`,
    );
    assert.equal(downloadV1.status, 200);
    assert.equal(downloadV1.headers.get("content-type"), "application/pdf");
    const v1Bytes = Buffer.from(await downloadV1.arrayBuffer());
    assert.equal(detectAllowedFileType(v1Bytes)?.mimeType, "application/pdf");

    const downloadCurrent = await api(`/documents/${documentId}/download`);
    assert.equal(downloadCurrent.status, 200);
    assert.equal(downloadCurrent.headers.get("content-type"), "image/png");
  });

  it("keeps version files on distinct storage keys", async () => {
    const documentId = await createOwnedDocument(
      "Distinct storage",
      makePdfBuffer(),
      "a.pdf",
      "application/pdf",
    );

    const replaceForm = new FormData();
    replaceForm.set(
      "file",
      new Blob([makePdfBuffer(16)], { type: "application/pdf" }),
      "b.pdf",
    );
    const createVersion = await api(`/documents/${documentId}/versions`, {
      method: "POST",
      body: replaceForm,
    });
    assert.equal(createVersion.status, 201);

    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: "asc" },
    });
    assert.equal(versions.length, 2);
    assert.ok(versions[0]?.storageKey);
    assert.ok(versions[1]?.storageKey);
    assert.notEqual(versions[0]?.storageKey, versions[1]?.storageKey);

    const pathA = path.resolve(storageRoot, ...versions[0]!.storageKey!.split("/"));
    const pathB = path.resolve(storageRoot, ...versions[1]!.storageKey!.split("/"));
    await fs.access(pathA);
    await fs.access(pathB);
  });

  it("blocks another user from listing or downloading versions", async () => {
    const documentId = await createOwnedDocument(
      "Private versions",
      makePdfBuffer(),
      "private.pdf",
      "application/pdf",
    );

    const version = await prisma.documentVersion.findFirst({
      where: { documentId, isCurrent: true },
    });
    assert.ok(version);

    const listAsB = await api(
      `/documents/${documentId}/versions`,
      {},
      cookieB,
    );
    assert.equal(listAsB.status, 404);

    const downloadAsB = await api(
      `/documents/${documentId}/versions/${version!.id}/download`,
      {},
      cookieB,
    );
    assert.equal(downloadAsB.status, 404);

    const uploadAsB = new FormData();
    uploadAsB.set(
      "file",
      new Blob([makePngBuffer()], { type: "image/png" }),
      "hijack.png",
    );
    const createAsB = await api(
      `/documents/${documentId}/versions`,
      { method: "POST", body: uploadAsB },
      cookieB,
    );
    assert.equal(createAsB.status, 404);
  });

  it("rejects invalid version uploads", async () => {
    const documentId = await createOwnedDocument(
      "Invalid replace target",
      makePdfBuffer(),
      "base.pdf",
      "application/pdf",
    );

    const missingFile = new FormData();
    const missingResponse = await api(`/documents/${documentId}/versions`, {
      method: "POST",
      body: missingFile,
    });
    assert.equal(missingResponse.status, 400);

    const badType = new FormData();
    badType.set(
      "file",
      new Blob([Buffer.from("not-a-real-pdf")], { type: "application/pdf" }),
      "fake.pdf",
    );
    const badTypeResponse = await api(`/documents/${documentId}/versions`, {
      method: "POST",
      body: badType,
    });
    assert.equal(badTypeResponse.status, 400);

    const oversized = new FormData();
    oversized.set(
      "file",
      new Blob([makePdfBuffer(70 * 1024)], { type: "application/pdf" }),
      "big.pdf",
    );
    const oversizedResponse = await api(`/documents/${documentId}/versions`, {
      method: "POST",
      body: oversized,
    });
    assert.equal(oversizedResponse.status, 400);
    const body = (await oversizedResponse.json()) as { code?: string };
    assert.equal(body.code, "FILE_TOO_LARGE");
  });
});
