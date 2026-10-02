import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

dotenv.config();

const TEST_EMAIL_A = `phase9-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = `phase9-b-${Date.now()}@example.com`;
const PASSWORD = "securepass1";

let server: Server;
let baseUrl: string;
let cookieA = "";
let cookieB = "";
let userIdA = "";

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
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${baseUrl}${pathName}`, { ...init, headers });
}

describe("Phase 9 renewals and deadlines", () => {
  before(async () => {
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
    const bodyA = (await registerA.json()) as { user: { id: string } };
    userIdA = bodyA.user.id;

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
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_EMAIL_A, TEST_EMAIL_B] } },
    });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await prisma.$disconnect();
  });

  it("rejects unauthenticated renewal and deadline access", async () => {
    const renewals = await api("/renewals", {}, "");
    assert.equal(renewals.status, 401);
    const deadlines = await api("/deadlines", {}, "");
    assert.equal(deadlines.status, 401);
  });

  it("creates, lists, retrieves, updates, and deletes a renewal", async () => {
    const createResponse = await api("/renewals", {
      method: "POST",
      body: JSON.stringify({
        title: "Passport renewal",
        kind: "PASSPORT",
        dueOn: "2026-06-01",
        actionUrl: "https://passport.gov.example/renew",
        notes: "Book appointment early",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      renewal: {
        id: string;
        title: string;
        kind: string;
        dueOn: string;
        status: string;
        actionUrl: string | null;
      };
    };
    assert.equal(created.renewal.title, "Passport renewal");
    assert.equal(created.renewal.kind, "PASSPORT");
    assert.equal(created.renewal.dueOn, "2026-06-01");
    assert.equal(created.renewal.status, "UPCOMING");
    assert.equal(
      created.renewal.actionUrl,
      "https://passport.gov.example/renew",
    );

    const listResponse = await api("/renewals");
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as {
      renewals: Array<{ id: string }>;
    };
    assert.ok(listed.renewals.some((item) => item.id === created.renewal.id));

    const getResponse = await api(`/renewals/${created.renewal.id}`);
    assert.equal(getResponse.status, 200);

    const updateResponse = await api(`/renewals/${created.renewal.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "DUE", kind: "OTHER" }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()) as {
      renewal: { status: string; kind: string };
    };
    assert.equal(updated.renewal.status, "DUE");
    assert.equal(updated.renewal.kind, "OTHER");

    const deleteResponse = await api(`/renewals/${created.renewal.id}`, {
      method: "DELETE",
    });
    assert.equal(deleteResponse.status, 204);
  });

  it("creates, lists, retrieves, updates, and deletes a deadline", async () => {
    const createResponse = await api("/deadlines", {
      method: "POST",
      body: JSON.stringify({
        title: "Scholarship application",
        dueOn: "2026-04-15",
        actionUrl: "https://apply.example/scholarship",
        notes: "Need recommendation letter",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      deadline: {
        id: string;
        title: string;
        dueOn: string;
        status: string;
        actionUrl: string | null;
      };
    };
    assert.equal(created.deadline.title, "Scholarship application");
    assert.equal(created.deadline.dueOn, "2026-04-15");
    assert.equal(created.deadline.status, "OPEN");
    assert.equal(
      created.deadline.actionUrl,
      "https://apply.example/scholarship",
    );

    const listResponse = await api("/deadlines");
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as {
      deadlines: Array<{ id: string }>;
    };
    assert.ok(listed.deadlines.some((item) => item.id === created.deadline.id));

    const getResponse = await api(`/deadlines/${created.deadline.id}`);
    assert.equal(getResponse.status, 200);

    const updateResponse = await api(`/deadlines/${created.deadline.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()) as {
      deadline: { status: string };
    };
    assert.equal(updated.deadline.status, "COMPLETED");

    const deleteResponse = await api(`/deadlines/${created.deadline.id}`, {
      method: "DELETE",
    });
    assert.equal(deleteResponse.status, 204);
  });

  it("rejects invalid renewal and deadline input", async () => {
    const missingTitle = await api("/renewals", {
      method: "POST",
      body: JSON.stringify({ dueOn: "2026-01-01" }),
    });
    assert.equal(missingTitle.status, 400);

    const badKind = await api("/renewals", {
      method: "POST",
      body: JSON.stringify({
        title: "Bad kind",
        dueOn: "2026-01-01",
        kind: "NOT_A_KIND",
      }),
    });
    assert.equal(badKind.status, 400);

    const badUrl = await api("/deadlines", {
      method: "POST",
      body: JSON.stringify({
        title: "Bad URL",
        dueOn: "2026-01-01",
        actionUrl: "not-a-url",
      }),
    });
    assert.equal(badUrl.status, 400);

    const badStatus = await api("/deadlines", {
      method: "POST",
      body: JSON.stringify({
        title: "Bad status",
        dueOn: "2026-01-01",
        status: "PENDING",
      }),
    });
    assert.equal(badStatus.status, 400);
  });

  it("links an owned vault document and rejects foreign documents", async () => {
    const document = await prisma.document.create({
      data: {
        userId: userIdA,
        title: "Passport scan",
        category: "PASSPORT",
        status: "ACTIVE",
      },
    });

    const foreignDoc = await prisma.document.create({
      data: {
        userId: (
          await prisma.user.findUniqueOrThrow({
            where: { email: TEST_EMAIL_B },
          })
        ).id,
        title: "Foreign doc",
        category: "OTHER",
        status: "ACTIVE",
      },
    });

    const linked = await api("/renewals", {
      method: "POST",
      body: JSON.stringify({
        title: "Passport",
        kind: "PASSPORT",
        dueOn: "2027-01-01",
        linkedDocumentId: document.id,
      }),
    });
    assert.equal(linked.status, 201);
    const linkedBody = (await linked.json()) as {
      renewal: {
        id: string;
        linkedDocumentId: string | null;
        linkedDocumentTitle: string | null;
      };
    };
    assert.equal(linkedBody.renewal.linkedDocumentId, document.id);
    assert.equal(linkedBody.renewal.linkedDocumentTitle, "Passport scan");

    const foreign = await api("/deadlines", {
      method: "POST",
      body: JSON.stringify({
        title: "Should fail",
        dueOn: "2026-05-01",
        linkedDocumentId: foreignDoc.id,
      }),
    });
    assert.equal(foreign.status, 400);

    await api(`/renewals/${linkedBody.renewal.id}`, { method: "DELETE" });
  });

  it("isolates renewals and deadlines between users", async () => {
    const createResponse = await api("/renewals", {
      method: "POST",
      body: JSON.stringify({
        title: "Private renewal",
        kind: "DOMAIN",
        dueOn: "2026-08-01",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      renewal: { id: string };
    };

    const foreignGet = await api(`/renewals/${created.renewal.id}`, {}, cookieB);
    assert.equal(foreignGet.status, 404);

    const foreignList = await api("/renewals", {}, cookieB);
    assert.equal(foreignList.status, 200);
    const listed = (await foreignList.json()) as {
      renewals: Array<{ id: string }>;
    };
    assert.ok(!listed.renewals.some((item) => item.id === created.renewal.id));

    const foreignDelete = await api(
      `/renewals/${created.renewal.id}`,
      { method: "DELETE" },
      cookieB,
    );
    assert.equal(foreignDelete.status, 404);

    const deadlineCreate = await api("/deadlines", {
      method: "POST",
      body: JSON.stringify({
        title: "Private deadline",
        dueOn: "2026-09-01",
      }),
    });
    assert.equal(deadlineCreate.status, 201);
    const deadline = (await deadlineCreate.json()) as {
      deadline: { id: string };
    };

    const foreignDeadline = await api(
      `/deadlines/${deadline.deadline.id}`,
      {},
      cookieB,
    );
    assert.equal(foreignDeadline.status, 404);

    await api(`/renewals/${created.renewal.id}`, { method: "DELETE" });
    await api(`/deadlines/${deadline.deadline.id}`, { method: "DELETE" });
  });
});
