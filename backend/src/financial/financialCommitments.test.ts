import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import {
  expandOccurrences,
  FINANCIAL_WINDOWS_DAYS,
} from "../services/financialCommitmentService.js";
import { BillingInterval } from "@prisma/client";

dotenv.config();

const TEST_EMAIL_A = `phase12-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = `phase12-b-${Date.now()}@example.com`;
const PASSWORD = "securepass1";

let server: Server;
let baseUrl: string;
let cookieA = "";
let cookieB = "";
let userIdA = "";
let userIdB = "";

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

function utcDate(daysFromToday: number): Date {
  const today = new Date();
  const date = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

type FinancialBody = {
  windows: Array<{
    days: number;
    rangeStart: string;
    rangeEnd: string;
    totalsByCurrency: Array<{
      currency: string;
      total: string;
      occurrenceCount: number;
      countedOccurrenceCount: number;
    }>;
    items: Array<{
      id: string;
      sourceType: string;
      sourceId: string;
      title: string;
      amount: string | null;
      currency: string;
      dueOn: string;
      billingInterval: string;
      href: string;
    }>;
  }>;
  notes: Record<string, string>;
};

describe("Phase 12 financial commitments", () => {
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
    const bodyB = (await registerB.json()) as { user: { id: string } };
    userIdB = bodyB.user.id;
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

  it("rejects unauthenticated financial commitments access", async () => {
    const response = await api("/financial-commitments", {}, "");
    assert.equal(response.status, 401);
  });

  it("returns empty windows when the user has no active recurring commitments", async () => {
    const response = await api("/financial-commitments");
    assert.equal(response.status, 200);
    const body = (await response.json()) as FinancialBody;
    assert.deepEqual(
      body.windows.map((w) => w.days),
      [...FINANCIAL_WINDOWS_DAYS],
    );
    for (const window of body.windows) {
      assert.deepEqual(window.items, []);
      assert.deepEqual(window.totalsByCurrency, []);
    }
  });

  it("expands weekly occurrences within window boundaries", () => {
    const today = utcDate(0);
    const start = today;
    const end7 = utcDate(7);
    const next = utcDate(1);
    const dates = expandOccurrences(
      next,
      BillingInterval.WEEKLY,
      start,
      end7,
    );
    assert.equal(dates.length, 1);
    assert.equal(toDateOnly(dates[0]!), toDateOnly(next));

    const end30 = utcDate(30);
    const dates30 = expandOccurrences(
      next,
      BillingInterval.WEEKLY,
      start,
      end30,
    );
    assert.equal(dates30.length, 5);
    assert.equal(toDateOnly(dates30[0]!), toDateOnly(utcDate(1)));
    assert.equal(toDateOnly(dates30[4]!), toDateOnly(utcDate(29)));
  });

  it("does not invent CUSTOM schedules beyond the stored next date", () => {
    const today = utcDate(0);
    const dates = expandOccurrences(
      utcDate(3),
      BillingInterval.CUSTOM,
      today,
      utcDate(365),
    );
    assert.equal(dates.length, 1);
    assert.equal(toDateOnly(dates[0]!), toDateOnly(utcDate(3)));

    const overdue = expandOccurrences(
      utcDate(-2),
      BillingInterval.CUSTOM,
      today,
      utcDate(30),
    );
    assert.deepEqual(overdue, []);
  });

  it("aggregates owned recurring commitments across 7/30/365 windows without double-counting", async () => {
    const sub = await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "Streaming",
        provider: "StreamCo",
        amount: "499.00",
        currency: "INR",
        billingInterval: "MONTHLY",
        nextBillingOn: utcDate(3),
        status: "ACTIVE",
        actionUrl: "https://stream.example/pay",
      },
    });
    const rent = await prisma.recurringPayment.create({
      data: {
        userId: userIdA,
        name: "Rent",
        payee: "Landlord",
        amount: "15000.00",
        currency: "INR",
        billingInterval: "MONTHLY",
        nextDueOn: utcDate(5),
        status: "ACTIVE",
      },
    });
    // Same user, paused — must not appear
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "Paused gym",
        amount: "1000.00",
        currency: "INR",
        billingInterval: "MONTHLY",
        nextBillingOn: utcDate(2),
        status: "PAUSED",
      },
    });
    // Null next date — cannot project
    await prisma.recurringPayment.create({
      data: {
        userId: userIdA,
        name: "No due date",
        amount: "100.00",
        currency: "INR",
        billingInterval: "MONTHLY",
        nextDueOn: null,
        status: "ACTIVE",
      },
    });
    // Null amount — listed but excluded from totals
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "Unknown price",
        amount: null,
        currency: "INR",
        billingInterval: "YEARLY",
        nextBillingOn: utcDate(10),
        status: "ACTIVE",
      },
    });
    // Purchase must NOT become a recurring financial commitment
    await prisma.purchase.create({
      data: {
        userId: userIdA,
        name: "One-time gadget",
        purchasedOn: utcDate(0),
        amount: "99999.00",
        currency: "INR",
      },
    });
    // Other user's commitment
    await prisma.subscription.create({
      data: {
        userId: userIdB,
        name: "Foreign Netflix",
        amount: "649.00",
        currency: "INR",
        billingInterval: "MONTHLY",
        nextBillingOn: utcDate(1),
        status: "ACTIVE",
      },
    });
    await prisma.recurringPayment.create({
      data: {
        userId: userIdB,
        name: "Foreign rent",
        amount: "20000.00",
        currency: "INR",
        billingInterval: "MONTHLY",
        nextDueOn: utcDate(4),
        status: "ACTIVE",
      },
    });

    const response = await api("/financial-commitments");
    assert.equal(response.status, 200);
    const body = (await response.json()) as FinancialBody;

    const w7 = body.windows.find((w) => w.days === 7);
    const w30 = body.windows.find((w) => w.days === 30);
    const w365 = body.windows.find((w) => w.days === 365);
    assert.ok(w7 && w30 && w365);

    const titles7 = w7!.items.map((i) => i.title);
    assert.ok(titles7.includes("Streaming"));
    assert.ok(titles7.includes("Rent"));
    assert.ok(!titles7.includes("Paused gym"));
    assert.ok(!titles7.includes("No due date"));
    assert.ok(!titles7.includes("Unknown price")); // day 10 is outside 7-day window
    assert.ok(!titles7.includes("One-time gadget"));
    assert.ok(!titles7.includes("Foreign Netflix"));
    assert.ok(!titles7.includes("Foreign rent"));

    // Boundary: day 7 inclusive — place a commitment on day 7
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "Boundary day-7",
        amount: "10.00",
        currency: "INR",
        billingInterval: "CUSTOM",
        nextBillingOn: utcDate(7),
        status: "ACTIVE",
      },
    });
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "Outside day-8",
        amount: "10.00",
        currency: "INR",
        billingInterval: "CUSTOM",
        nextBillingOn: utcDate(8),
        status: "ACTIVE",
      },
    });

    const boundaryRes = await api("/financial-commitments");
    const boundaryBody = (await boundaryRes.json()) as FinancialBody;
    const b7 = boundaryBody.windows.find((w) => w.days === 7)!;
    const bTitles = b7.items.map((i) => i.title);
    assert.ok(bTitles.includes("Boundary day-7"));
    assert.ok(!bTitles.includes("Outside day-8"));

    // Unknown price appears in 30-day window with null amount
    const b30 = boundaryBody.windows.find((w) => w.days === 30)!;
    const unknown = b30.items.find((i) => i.title === "Unknown price");
    assert.ok(unknown);
    assert.equal(unknown?.amount, null);

    // Totals: Streaming 499 + Rent 15000 + Boundary 10 = 15509 in 7-day (unknown excluded)
    const inr7 = b7.totalsByCurrency.find((t) => t.currency === "INR");
    assert.ok(inr7);
    assert.equal(inr7?.total, "15509.00");
    assert.equal(inr7?.countedOccurrenceCount, 3);
    assert.equal(inr7?.occurrenceCount, 3);

    // Monthly expansion in 365 days: Streaming ~12 + Rent ~12 (from day 3/5)
    const b365 = boundaryBody.windows.find((w) => w.days === 365)!;
    const streamOcc = b365.items.filter(
      (i) => i.sourceId === sub.id && i.sourceType === "subscription",
    );
    const rentOcc = b365.items.filter(
      (i) => i.sourceId === rent.id && i.sourceType === "recurring_payment",
    );
    assert.ok(streamOcc.length >= 12 && streamOcc.length <= 13);
    assert.ok(rentOcc.length >= 12 && rentOcc.length <= 13);

    // No duplicate occurrence ids
    const ids = b365.items.map((i) => i.id);
    assert.equal(ids.length, new Set(ids).size);

    // Each occurrence id is unique per source+date
    for (const item of streamOcc) {
      assert.match(item.id, /^subscription:[^:]+:\d{4}-\d{2}-\d{2}$/);
    }

    // Cross-user isolation
    const asB = await api("/financial-commitments", {}, cookieB);
    assert.equal(asB.status, 200);
    const bodyB = (await asB.json()) as FinancialBody;
    const titlesB = bodyB.windows
      .flatMap((w) => w.items)
      .map((i) => i.title);
    assert.ok(titlesB.includes("Foreign Netflix"));
    assert.ok(titlesB.includes("Foreign rent"));
    assert.ok(!titlesB.includes("Streaming"));
    assert.ok(!titlesB.includes("Rent"));
    assert.ok(!titlesB.includes("Boundary day-7"));
  });

  it("does not double-count the same subscription across source types", async () => {
    // Fresh check: one subscription must produce one occurrence per due date, not duplicated
    const response = await api("/financial-commitments");
    const body = (await response.json()) as FinancialBody;
    const w30 = body.windows.find((w) => w.days === 30)!;
    const streaming = w30.items.filter((i) => i.title === "Streaming");
    // Monthly with next at day 3: only one occurrence in 30 days
    assert.equal(streaming.length, 1);
    assert.equal(streaming[0]?.sourceType, "subscription");

    // Purchases never appear
    assert.ok(!w30.items.some((i) => i.title === "One-time gadget"));
  });

  it("advances overdue known-interval commitments into the next windows", async () => {
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "Overdue weekly",
        amount: "50.00",
        currency: "INR",
        billingInterval: "WEEKLY",
        nextBillingOn: utcDate(-3),
        status: "ACTIVE",
      },
    });

    const response = await api("/financial-commitments");
    const body = (await response.json()) as FinancialBody;
    const w7 = body.windows.find((w) => w.days === 7)!;
    const overdueItems = w7.items.filter((i) => i.title === "Overdue weekly");
    // -3 + 7 = day 4 (first in window); then day 11 is outside 7-day → one occurrence
    assert.equal(overdueItems.length, 1);
    assert.equal(overdueItems[0]?.dueOn, toDateOnly(utcDate(4)));
    assert.ok(!overdueItems.some((i) => i.dueOn === toDateOnly(utcDate(-3))));
  });

  it("groups totals by currency without converting across currencies", async () => {
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "USD tool",
        amount: "12.50",
        currency: "USD",
        billingInterval: "CUSTOM",
        nextBillingOn: utcDate(2),
        status: "ACTIVE",
      },
    });
    await prisma.recurringPayment.create({
      data: {
        userId: userIdA,
        name: "EUR fee",
        amount: "8.00",
        currency: "EUR",
        billingInterval: "CUSTOM",
        nextDueOn: utcDate(2),
        status: "ACTIVE",
      },
    });

    const response = await api("/financial-commitments");
    assert.equal(response.status, 200);
    const body = (await response.json()) as FinancialBody;
    const w7 = body.windows.find((w) => w.days === 7)!;
    const usd = w7.totalsByCurrency.find((t) => t.currency === "USD");
    const eur = w7.totalsByCurrency.find((t) => t.currency === "EUR");
    assert.equal(usd?.total, "12.50");
    assert.equal(eur?.total, "8.00");
    assert.ok(!w7.totalsByCurrency.some((t) => t.currency === "XYZ"));
  });
});
