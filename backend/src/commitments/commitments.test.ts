import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

dotenv.config();

const TEST_EMAIL_A = `phase7-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = `phase7-b-${Date.now()}@example.com`;
const PASSWORD = "securepass1";

let server: Server;
let baseUrl: string;
let cookieA = "";
let cookieB = "";

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

describe("Phase 7 commitments", () => {
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

  it("rejects unauthenticated commitment access", async () => {
    const subs = await api("/subscriptions", {}, "");
    assert.equal(subs.status, 401);
    const pays = await api("/recurring-payments", {}, "");
    assert.equal(pays.status, 401);
  });

  it("creates, lists, updates, and deletes a subscription", async () => {
    const createResponse = await api("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        name: "Streaming service",
        provider: "ExampleCo",
        amount: "649.00",
        currency: "INR",
        billingInterval: "MONTHLY",
        nextBillingOn: "2026-11-01",
        actionUrl: "https://example.com/manage",
        notes: "Family plan",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      subscription: {
        id: string;
        name: string;
        amount: string | null;
        actionUrl: string | null;
        status: string;
      };
    };
    assert.equal(created.subscription.name, "Streaming service");
    assert.equal(created.subscription.amount, "649.00");
    assert.equal(created.subscription.actionUrl, "https://example.com/manage");
    assert.equal(created.subscription.status, "ACTIVE");

    const listResponse = await api("/subscriptions");
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as {
      subscriptions: Array<{ id: string }>;
    };
    assert.ok(
      listed.subscriptions.some((item) => item.id === created.subscription.id),
    );

    const getResponse = await api(`/subscriptions/${created.subscription.id}`);
    assert.equal(getResponse.status, 200);

    const updateResponse = await api(`/subscriptions/${created.subscription.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "PAUSED", amount: "699.00" }),
    });
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()) as {
      subscription: { status: string; amount: string | null };
    };
    assert.equal(updated.subscription.status, "PAUSED");
    assert.equal(updated.subscription.amount, "699.00");

    const deleteResponse = await api(
      `/subscriptions/${created.subscription.id}`,
      { method: "DELETE" },
    );
    assert.equal(deleteResponse.status, 204);
  });

  it("creates and manages recurring payments", async () => {
    const createResponse = await api("/recurring-payments", {
      method: "POST",
      body: JSON.stringify({
        name: "Apartment rent",
        payee: "Landlord",
        amount: "25000.00",
        billingInterval: "MONTHLY",
        nextDueOn: "2026-10-05",
        actionUrl: "https://example.com/pay-rent",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      recurringPayment: { id: string; name: string; payee: string | null };
    };
    assert.equal(created.recurringPayment.name, "Apartment rent");
    assert.equal(created.recurringPayment.payee, "Landlord");

    const listResponse = await api("/recurring-payments");
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as {
      recurringPayments: Array<{ id: string }>;
    };
    assert.ok(
      listed.recurringPayments.some(
        (item) => item.id === created.recurringPayment.id,
      ),
    );

    const updateResponse = await api(
      `/recurring-payments/${created.recurringPayment.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      },
    );
    assert.equal(updateResponse.status, 200);

    const deleteResponse = await api(
      `/recurring-payments/${created.recurringPayment.id}`,
      { method: "DELETE" },
    );
    assert.equal(deleteResponse.status, 204);
  });

  it("rejects invalid commitment input", async () => {
    const missingName = await api("/subscriptions", {
      method: "POST",
      body: JSON.stringify({ billingInterval: "MONTHLY" }),
    });
    assert.equal(missingName.status, 400);

    const badUrl = await api("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        name: "Bad URL",
        billingInterval: "MONTHLY",
        actionUrl: "javascript:alert(1)",
      }),
    });
    assert.equal(badUrl.status, 400);

    const badAmount = await api("/recurring-payments", {
      method: "POST",
      body: JSON.stringify({
        name: "Bad amount",
        billingInterval: "WEEKLY",
        amount: "12.345",
      }),
    });
    assert.equal(badAmount.status, 400);
  });

  it("enforces ownership isolation across users", async () => {
    const createResponse = await api(
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Owner only sub",
          billingInterval: "YEARLY",
          amount: "1200.00",
        }),
      },
      cookieA,
    );
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      subscription: { id: string };
    };

    const getAsB = await api(
      `/subscriptions/${created.subscription.id}`,
      {},
      cookieB,
    );
    assert.equal(getAsB.status, 404);

    const updateAsB = await api(
      `/subscriptions/${created.subscription.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Hijacked" }),
      },
      cookieB,
    );
    assert.equal(updateAsB.status, 404);

    const paymentCreate = await api(
      "/recurring-payments",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Owner only payment",
          billingInterval: "MONTHLY",
        }),
      },
      cookieA,
    );
    assert.equal(paymentCreate.status, 201);
    const payment = (await paymentCreate.json()) as {
      recurringPayment: { id: string };
    };

    const paymentAsB = await api(
      `/recurring-payments/${payment.recurringPayment.id}`,
      {},
      cookieB,
    );
    assert.equal(paymentAsB.status, 404);
  });

  it("stores action URLs without executing them as integrations", async () => {
    const url = "https://billing.example.com/portal";
    const createResponse = await api("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        name: "External manage link",
        billingInterval: "MONTHLY",
        actionUrl: url,
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as {
      subscription: { actionUrl: string | null };
    };
    assert.equal(created.subscription.actionUrl, url);
  });
});
