import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

dotenv.config();

const TEST_EMAIL_A = `phase8-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = `phase8-b-${Date.now()}@example.com`;
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

describe("Phase 8 purchases and warranties", () => {
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

  it("rejects unauthenticated purchase access", async () => {
    const response = await api("/purchases", {}, "");
    assert.equal(response.status, 401);
  });

  it("creates, lists, retrieves, updates, and deletes a purchase", async () => {
    const createResponse = await api("/purchases", {
      method: "POST",
      body: JSON.stringify({
        name: "Laptop",
        purchasedOn: "2026-01-15",
        amount: "89999.00",
        currency: "INR",
        vendor: "Example Store",
        notes: "Work machine",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      purchase: {
        id: string;
        name: string;
        amount: string | null;
        purchasedOn: string;
        vendor: string | null;
        warranty: null;
      };
    };
    assert.equal(created.purchase.name, "Laptop");
    assert.equal(created.purchase.amount, "89999.00");
    assert.equal(created.purchase.purchasedOn, "2026-01-15");
    assert.equal(created.purchase.vendor, "Example Store");
    assert.equal(created.purchase.warranty, null);

    const listResponse = await api("/purchases");
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as {
      purchases: Array<{ id: string }>;
    };
    assert.ok(listed.purchases.some((item) => item.id === created.purchase.id));

    const getResponse = await api(`/purchases/${created.purchase.id}`);
    assert.equal(getResponse.status, 200);

    const updateResponse = await api(`/purchases/${created.purchase.id}`, {
      method: "PATCH",
      body: JSON.stringify({ vendor: "Updated Vendor", amount: "87999.00" }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()) as {
      purchase: { vendor: string | null; amount: string | null };
    };
    assert.equal(updated.purchase.vendor, "Updated Vendor");
    assert.equal(updated.purchase.amount, "87999.00");

    const deleteResponse = await api(`/purchases/${created.purchase.id}`, {
      method: "DELETE",
    });
    assert.equal(deleteResponse.status, 204);
  });

  it("rejects invalid purchase input", async () => {
    const missingName = await api("/purchases", {
      method: "POST",
      body: JSON.stringify({ purchasedOn: "2026-01-01" }),
    });
    assert.equal(missingName.status, 400);

    const missingDate = await api("/purchases", {
      method: "POST",
      body: JSON.stringify({ name: "No date" }),
    });
    assert.equal(missingDate.status, 400);

    const badAmount = await api("/purchases", {
      method: "POST",
      body: JSON.stringify({
        name: "Bad amount",
        purchasedOn: "2026-01-01",
        amount: "12.345",
      }),
    });
    assert.equal(badAmount.status, 400);
  });

  it("creates and updates warranty tied to a purchase", async () => {
    const createResponse = await api("/purchases", {
      method: "POST",
      body: JSON.stringify({
        name: "Headphones",
        purchasedOn: "2026-02-01",
        amount: "4999.00",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      purchase: { id: string };
    };

    const warrantyCreate = await api(
      `/purchases/${created.purchase.id}/warranty`,
      {
        method: "PUT",
        body: JSON.stringify({
          provider: "Manufacturer",
          startsOn: "2026-02-01",
          endsOn: "2027-02-01",
          terms: "1 year parts and labour",
        }),
      },
    );
    assert.equal(warrantyCreate.status, 200);
    const withWarranty = (await warrantyCreate.json()) as {
      purchase: {
        warranty: {
          id: string;
          provider: string | null;
          endsOn: string;
          startsOn: string | null;
        } | null;
      };
    };
    assert.ok(withWarranty.purchase.warranty);
    assert.equal(withWarranty.purchase.warranty?.provider, "Manufacturer");
    assert.equal(withWarranty.purchase.warranty?.endsOn, "2027-02-01");

    const warrantyUpdate = await api(
      `/purchases/${created.purchase.id}/warranty`,
      {
        method: "PUT",
        body: JSON.stringify({
          provider: "Extended Care",
          startsOn: "2026-02-01",
          endsOn: "2028-02-01",
          notes: "Extended",
        }),
      },
    );
    assert.equal(warrantyUpdate.status, 200);
    const updated = (await warrantyUpdate.json()) as {
      purchase: {
        warranty: { provider: string | null; endsOn: string } | null;
      };
    };
    assert.equal(updated.purchase.warranty?.provider, "Extended Care");
    assert.equal(updated.purchase.warranty?.endsOn, "2028-02-01");

    const badWarranty = await api(
      `/purchases/${created.purchase.id}/warranty`,
      {
        method: "PUT",
        body: JSON.stringify({
          startsOn: "2028-01-01",
          endsOn: "2027-01-01",
        }),
      },
    );
    assert.equal(badWarranty.status, 400);

    const deleteWarranty = await api(
      `/purchases/${created.purchase.id}/warranty`,
      { method: "DELETE" },
    );
    assert.equal(deleteWarranty.status, 200);
    const without = (await deleteWarranty.json()) as {
      purchase: { warranty: null };
    };
    assert.equal(without.purchase.warranty, null);
  });

  it("enforces purchase ownership isolation", async () => {
    const createResponse = await api(
      "/purchases",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Owner only purchase",
          purchasedOn: "2026-03-01",
          amount: "100.00",
        }),
      },
      cookieA,
    );
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      purchase: { id: string };
    };

    const getAsB = await api(
      `/purchases/${created.purchase.id}`,
      {},
      cookieB,
    );
    assert.equal(getAsB.status, 404);

    const updateAsB = await api(
      `/purchases/${created.purchase.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Hijacked" }),
      },
      cookieB,
    );
    assert.equal(updateAsB.status, 404);

    const warrantyAsB = await api(
      `/purchases/${created.purchase.id}/warranty`,
      {
        method: "PUT",
        body: JSON.stringify({ endsOn: "2027-03-01" }),
      },
      cookieB,
    );
    assert.equal(warrantyAsB.status, 404);
  });

  it("links an owned vault document as a receipt", async () => {
    const document = await prisma.document.create({
      data: {
        userId: userIdA,
        title: "Synthetic receipt",
        category: "RECEIPT",
      },
    });

    const createResponse = await api("/purchases", {
      method: "POST",
      body: JSON.stringify({
        name: "Monitor",
        purchasedOn: "2026-04-01",
        amount: "15000.00",
        receiptDocumentId: document.id,
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      purchase: {
        receiptDocumentId: string | null;
        receiptTitle: string | null;
      };
    };
    assert.equal(created.purchase.receiptDocumentId, document.id);
    assert.equal(created.purchase.receiptTitle, "Synthetic receipt");

    const foreignDoc = await api("/purchases", {
      method: "POST",
      body: JSON.stringify({
        name: "Bad receipt link",
        purchasedOn: "2026-04-02",
        receiptDocumentId: "nonexistent-doc-id",
      }),
    });
    assert.equal(foreignDoc.status, 400);
  });
});
