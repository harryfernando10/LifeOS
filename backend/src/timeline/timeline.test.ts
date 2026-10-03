import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import {
  TIMELINE_FUTURE_DAYS,
  TIMELINE_PAST_DAYS,
} from "../services/timelineService.js";

dotenv.config();

const TEST_EMAIL_A = `phase11-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = `phase11-b-${Date.now()}@example.com`;
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

type TimelineBody = {
  pastDays: number;
  futureDays: number;
  rangeStart: string;
  rangeEnd: string;
  items: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
    status: string | null;
    temporal: string;
    sourceId: string;
    href: string;
    actionUrl: string | null;
  }>;
};

describe("Phase 11 timeline", () => {
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

  it("rejects unauthenticated timeline access", async () => {
    const response = await api("/timeline", {}, "");
    assert.equal(response.status, 401);
  });

  it("returns an empty timeline when the user has no dated events", async () => {
    const response = await api("/timeline");
    assert.equal(response.status, 200);
    const body = (await response.json()) as TimelineBody;
    assert.equal(body.pastDays, TIMELINE_PAST_DAYS);
    assert.equal(body.futureDays, TIMELINE_FUTURE_DAYS);
    assert.deepEqual(body.items, []);
  });

  it("aggregates owned events chronologically and excludes other users", async () => {
    const pastDeadline = await prisma.deadline.create({
      data: {
        userId: userIdA,
        title: "Past scholarship",
        dueOn: utcDate(-10),
        status: "COMPLETED",
      },
    });
    const upcomingRenewal = await prisma.renewal.create({
      data: {
        userId: userIdA,
        title: "Passport renewal",
        kind: "PASSPORT",
        dueOn: utcDate(20),
        status: "UPCOMING",
        actionUrl: "https://passport.example/renew",
      },
    });
    const midDeadline = await prisma.deadline.create({
      data: {
        userId: userIdA,
        title: "Mid internship",
        dueOn: utcDate(5),
        status: "OPEN",
      },
    });
    await prisma.deadline.create({
      data: {
        userId: userIdA,
        title: "Outside future window",
        dueOn: utcDate(TIMELINE_FUTURE_DAYS + 10),
        status: "OPEN",
      },
    });
    await prisma.deadline.create({
      data: {
        userId: userIdA,
        title: "Outside past window",
        dueOn: utcDate(-(TIMELINE_PAST_DAYS + 10)),
        status: "COMPLETED",
      },
    });
    await prisma.deadline.create({
      data: {
        userId: userIdB,
        title: "Foreign deadline",
        dueOn: utcDate(3),
        status: "OPEN",
      },
    });
    await prisma.renewal.create({
      data: {
        userId: userIdB,
        title: "Foreign renewal",
        kind: "INSURANCE",
        dueOn: utcDate(4),
        status: "UPCOMING",
      },
    });

    const response = await api("/timeline");
    assert.equal(response.status, 200);
    const body = (await response.json()) as TimelineBody;
    const titles = body.items.map((item) => item.title);

    assert.ok(titles.includes("Past scholarship"));
    assert.ok(titles.includes("Mid internship"));
    assert.ok(titles.includes("Passport renewal"));
    assert.ok(!titles.includes("Outside future window"));
    assert.ok(!titles.includes("Outside past window"));
    assert.ok(!titles.includes("Foreign deadline"));
    assert.ok(!titles.includes("Foreign renewal"));

    const pastItem = body.items.find((item) => item.sourceId === pastDeadline.id);
    assert.ok(pastItem);
    assert.equal(pastItem?.type, "deadline");
    assert.equal(pastItem?.temporal, "past");
    assert.equal(pastItem?.status, "COMPLETED");
    assert.equal(pastItem?.href, "/app/renewals");
    assert.equal(pastItem?.date, toDateOnly(utcDate(-10)));

    const renewalItem = body.items.find(
      (item) => item.sourceId === upcomingRenewal.id,
    );
    assert.ok(renewalItem);
    assert.equal(renewalItem?.type, "renewal");
    assert.equal(renewalItem?.temporal, "upcoming");
    assert.equal(renewalItem?.actionUrl, "https://passport.example/renew");

    const midItem = body.items.find((item) => item.sourceId === midDeadline.id);
    assert.ok(midItem);
    assert.equal(midItem?.temporal, "upcoming");

    const dates = body.items.map((item) => item.date);
    const sorted = [...dates].sort();
    assert.deepEqual(dates, sorted);

    assert.ok(
      body.items.findIndex((item) => item.sourceId === pastDeadline.id) <
        body.items.findIndex((item) => item.sourceId === midDeadline.id),
    );
    assert.ok(
      body.items.findIndex((item) => item.sourceId === midDeadline.id) <
        body.items.findIndex((item) => item.sourceId === upcomingRenewal.id),
    );
  });

  it("includes commitments, document expirations, and warranties; skips null dates", async () => {
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "Streaming billing",
        billingInterval: "MONTHLY",
        nextBillingOn: utcDate(15),
        status: "ACTIVE",
        actionUrl: "https://billing.example/stream",
      },
    });
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "No billing date",
        billingInterval: "MONTHLY",
        nextBillingOn: null,
        status: "ACTIVE",
      },
    });
    await prisma.recurringPayment.create({
      data: {
        userId: userIdA,
        name: "Rent due",
        billingInterval: "MONTHLY",
        nextDueOn: utcDate(-5),
        status: "ACTIVE",
      },
    });
    await prisma.recurringPayment.create({
      data: {
        userId: userIdA,
        name: "Payment without date",
        billingInterval: "MONTHLY",
        nextDueOn: null,
        status: "ACTIVE",
      },
    });
    await prisma.document.create({
      data: {
        userId: userIdA,
        title: "Licence expiry",
        category: "DRIVING_LICENCE",
        status: "ACTIVE",
        expiresOn: utcDate(40),
      },
    });
    await prisma.document.create({
      data: {
        userId: userIdA,
        title: "No expiry date",
        category: "OTHER",
        status: "ACTIVE",
        expiresOn: null,
      },
    });
    await prisma.document.create({
      data: {
        userId: userIdA,
        title: "Archived passport",
        category: "PASSPORT",
        status: "ARCHIVED",
        expiresOn: utcDate(8),
      },
    });
    const purchase = await prisma.purchase.create({
      data: {
        userId: userIdA,
        name: "Laptop",
        purchasedOn: utcDate(-100),
      },
    });
    await prisma.warranty.create({
      data: {
        userId: userIdA,
        purchaseId: purchase.id,
        endsOn: utcDate(60),
        provider: "OEM",
      },
    });
    await prisma.subscription.create({
      data: {
        userId: userIdB,
        name: "Foreign subscription",
        billingInterval: "MONTHLY",
        nextBillingOn: utcDate(2),
        status: "ACTIVE",
      },
    });

    const response = await api("/timeline");
    assert.equal(response.status, 200);
    const body = (await response.json()) as TimelineBody;
    const titles = body.items.map((item) => item.title);

    assert.ok(titles.includes("Streaming billing"));
    assert.ok(titles.includes("Rent due"));
    assert.ok(titles.includes("Licence expiry"));
    assert.ok(titles.includes("Laptop"));
    assert.ok(!titles.includes("No billing date"));
    assert.ok(!titles.includes("Payment without date"));
    assert.ok(!titles.includes("No expiry date"));
    assert.ok(!titles.includes("Archived passport"));
    assert.ok(!titles.includes("Foreign subscription"));

    const stream = body.items.find((item) => item.title === "Streaming billing");
    assert.equal(stream?.type, "subscription");
    assert.equal(stream?.href, "/app/commitments");
    assert.equal(stream?.actionUrl, "https://billing.example/stream");
    assert.equal(stream?.temporal, "upcoming");

    const rent = body.items.find((item) => item.title === "Rent due");
    assert.equal(rent?.type, "recurring_payment");
    assert.equal(rent?.temporal, "past");

    const doc = body.items.find((item) => item.title === "Licence expiry");
    assert.equal(doc?.type, "document");
    assert.equal(doc?.href, "/app/vault");

    const warranty = body.items.find((item) => item.title === "Laptop");
    assert.equal(warranty?.type, "warranty");
    assert.equal(warranty?.href, "/app/commitments");

    const dates = body.items.map((item) => item.date);
    const sorted = [...dates].sort();
    assert.deepEqual(dates, sorted);

    const asB = await api("/timeline", {}, cookieB);
    assert.equal(asB.status, 200);
    const bodyB = (await asB.json()) as TimelineBody;
    const titlesB = bodyB.items.map((item) => item.title);
    assert.ok(titlesB.includes("Foreign deadline") || titlesB.includes("Foreign renewal") || titlesB.includes("Foreign subscription"));
    assert.ok(!titlesB.includes("Past scholarship"));
    assert.ok(!titlesB.includes("Streaming billing"));
    assert.ok(!titlesB.includes("Licence expiry"));
    assert.ok(!titlesB.includes("Laptop"));
  });
});
