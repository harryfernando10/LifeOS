import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { ACTION_CENTER_UPCOMING_DAYS } from "../services/actionCenterService.js";

dotenv.config();

const TEST_EMAIL_A = `phase10-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = `phase10-b-${Date.now()}@example.com`;
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

type ActionCenterBody = {
  upcomingWindowDays: number;
  items: Array<{
    id: string;
    urgency: string;
    sourceType: string;
    title: string;
    dueOn: string;
    entityId: string;
    href: string;
  }>;
};

describe("Phase 10 action center", () => {
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

  it("rejects unauthenticated action center access", async () => {
    const response = await api("/action-center", {}, "");
    assert.equal(response.status, 401);
  });

  it("returns an empty action center when the user has no attention items", async () => {
    const response = await api("/action-center");
    assert.equal(response.status, 200);
    const body = (await response.json()) as ActionCenterBody;
    assert.equal(body.upcomingWindowDays, ACTION_CENTER_UPCOMING_DAYS);
    assert.deepEqual(body.items, []);
  });

  it("surfaces overdue and upcoming renewals and deadlines for the owner only", async () => {
    const overdueDeadline = await prisma.deadline.create({
      data: {
        userId: userIdA,
        title: "Overdue scholarship",
        dueOn: utcDate(-3),
        status: "OPEN",
      },
    });
    const upcomingDeadline = await prisma.deadline.create({
      data: {
        userId: userIdA,
        title: "Upcoming internship",
        dueOn: utcDate(10),
        status: "OPEN",
      },
    });
    const farDeadline = await prisma.deadline.create({
      data: {
        userId: userIdA,
        title: "Far future deadline",
        dueOn: utcDate(ACTION_CENTER_UPCOMING_DAYS + 5),
        status: "OPEN",
      },
    });
    const completedDeadline = await prisma.deadline.create({
      data: {
        userId: userIdA,
        title: "Completed deadline",
        dueOn: utcDate(-1),
        status: "COMPLETED",
      },
    });
    const overdueRenewal = await prisma.renewal.create({
      data: {
        userId: userIdA,
        title: "Passport overdue",
        kind: "PASSPORT",
        dueOn: utcDate(-2),
        status: "DUE",
      },
    });
    const upcomingRenewal = await prisma.renewal.create({
      data: {
        userId: userIdA,
        title: "Domain upcoming",
        kind: "DOMAIN",
        dueOn: utcDate(7),
        status: "UPCOMING",
      },
    });
    await prisma.deadline.create({
      data: {
        userId: userIdB,
        title: "Foreign deadline",
        dueOn: utcDate(-1),
        status: "OPEN",
      },
    });
    await prisma.renewal.create({
      data: {
        userId: userIdB,
        title: "Foreign renewal",
        kind: "INSURANCE",
        dueOn: utcDate(2),
        status: "UPCOMING",
      },
    });

    const response = await api("/action-center");
    assert.equal(response.status, 200);
    const body = (await response.json()) as ActionCenterBody;

    const titles = body.items.map((item) => item.title);
    assert.ok(titles.includes("Overdue scholarship"));
    assert.ok(titles.includes("Upcoming internship"));
    assert.ok(titles.includes("Passport overdue"));
    assert.ok(titles.includes("Domain upcoming"));
    assert.ok(!titles.includes("Far future deadline"));
    assert.ok(!titles.includes("Completed deadline"));
    assert.ok(!titles.includes("Foreign deadline"));
    assert.ok(!titles.includes("Foreign renewal"));

    const overdueItem = body.items.find(
      (item) => item.entityId === overdueDeadline.id,
    );
    assert.ok(overdueItem);
    assert.equal(overdueItem?.urgency, "overdue");
    assert.equal(overdueItem?.sourceType, "deadline");

    const upcomingItem = body.items.find(
      (item) => item.entityId === upcomingDeadline.id,
    );
    assert.ok(upcomingItem);
    assert.equal(upcomingItem?.urgency, "upcoming");

    const renewalOverdue = body.items.find(
      (item) => item.entityId === overdueRenewal.id,
    );
    assert.equal(renewalOverdue?.urgency, "overdue");

    const renewalUpcoming = body.items.find(
      (item) => item.entityId === upcomingRenewal.id,
    );
    assert.equal(renewalUpcoming?.urgency, "upcoming");

    assert.ok(
      body.items.findIndex((item) => item.entityId === overdueDeadline.id) <
        body.items.findIndex((item) => item.entityId === upcomingDeadline.id),
    );

    void farDeadline;
    void completedDeadline;
  });

  it("surfaces commitments, document expirations, and warranties within the window", async () => {
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "Streaming due soon",
        billingInterval: "MONTHLY",
        nextBillingOn: utcDate(5),
        status: "ACTIVE",
        actionUrl: "https://billing.example/stream",
      },
    });
    await prisma.subscription.create({
      data: {
        userId: userIdA,
        name: "Paused subscription",
        billingInterval: "MONTHLY",
        nextBillingOn: utcDate(2),
        status: "PAUSED",
      },
    });
    await prisma.recurringPayment.create({
      data: {
        userId: userIdA,
        name: "Rent overdue",
        billingInterval: "MONTHLY",
        nextDueOn: utcDate(-4),
        status: "ACTIVE",
      },
    });
    await prisma.document.create({
      data: {
        userId: userIdA,
        title: "Licence expiring",
        category: "DRIVING_LICENCE",
        status: "ACTIVE",
        expiresOn: utcDate(12),
      },
    });
    await prisma.document.create({
      data: {
        userId: userIdA,
        title: "Archived passport",
        category: "PASSPORT",
        status: "ARCHIVED",
        expiresOn: utcDate(3),
      },
    });
    const purchase = await prisma.purchase.create({
      data: {
        userId: userIdA,
        name: "Laptop",
        purchasedOn: utcDate(-400),
      },
    });
    await prisma.warranty.create({
      data: {
        userId: userIdA,
        purchaseId: purchase.id,
        endsOn: utcDate(8),
        provider: "OEM",
      },
    });
    await prisma.subscription.create({
      data: {
        userId: userIdB,
        name: "Foreign subscription",
        billingInterval: "MONTHLY",
        nextBillingOn: utcDate(1),
        status: "ACTIVE",
      },
    });

    const response = await api("/action-center");
    assert.equal(response.status, 200);
    const body = (await response.json()) as ActionCenterBody;
    const titles = body.items.map((item) => item.title);

    assert.ok(titles.includes("Streaming due soon"));
    assert.ok(titles.includes("Rent overdue"));
    assert.ok(titles.includes("Licence expiring"));
    assert.ok(titles.includes("Laptop"));
    assert.ok(!titles.includes("Paused subscription"));
    assert.ok(!titles.includes("Archived passport"));
    assert.ok(!titles.includes("Foreign subscription"));

    const rent = body.items.find((item) => item.title === "Rent overdue");
    assert.equal(rent?.urgency, "overdue");
    assert.equal(rent?.sourceType, "recurring_payment");
    assert.equal(rent?.href, "/app/commitments");

    const stream = body.items.find((item) => item.title === "Streaming due soon");
    assert.equal(stream?.urgency, "upcoming");
    assert.equal(stream?.sourceType, "subscription");

    const doc = body.items.find((item) => item.title === "Licence expiring");
    assert.equal(doc?.sourceType, "document");
    assert.equal(doc?.href, "/app/vault");

    const warranty = body.items.find((item) => item.title === "Laptop");
    assert.equal(warranty?.sourceType, "warranty");

    const asB = await api("/action-center", {}, cookieB);
    assert.equal(asB.status, 200);
    const bodyB = (await asB.json()) as ActionCenterBody;
    const titlesB = bodyB.items.map((item) => item.title);
    assert.ok(titlesB.includes("Foreign deadline") || titlesB.includes("Foreign renewal") || titlesB.includes("Foreign subscription"));
    assert.ok(!titlesB.includes("Overdue scholarship"));
    assert.ok(!titlesB.includes("Streaming due soon"));
    assert.ok(!titlesB.includes("Licence expiring"));
  });
});
