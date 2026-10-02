import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import dotenv from "dotenv";
import { prisma } from "../db/prisma.js";
import { hashPassword } from "../utils/password.js";
import { assertOwnership } from "../utils/ownership.js";
import { AppError } from "../errors/AppError.js";
import { USER_OWNED_MODEL_NAMES } from "../types/domain.js";

dotenv.config();

const suffix = Date.now();
const emailA = `phase4-a-${suffix}@example.com`;
const emailB = `phase4-b-${suffix}@example.com`;

let userAId = "";
let userBId = "";

describe("Phase 4 core data model", () => {
  before(async () => {
    const passwordHash = await hashPassword("securepass1");
    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: { email: emailA, passwordHash },
        select: { id: true },
      }),
      prisma.user.create({
        data: { email: emailB, passwordHash },
        select: { id: true },
      }),
    ]);
    userAId = userA.id;
    userBId = userB.id;
  });

  after(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await prisma.$disconnect();
  });

  it("documents are owned by userId and support versions", async () => {
    const document = await prisma.document.create({
      data: {
        userId: userAId,
        title: "Passport",
        category: "PASSPORT",
        expiresOn: new Date("2030-01-15"),
        versions: {
          create: {
            versionNumber: 1,
            isCurrent: true,
            originalFileName: "passport-scan.pdf",
            mimeType: "application/pdf",
          },
        },
      },
      include: { versions: true },
    });

    assert.equal(document.userId, userAId);
    assert.equal(document.versions.length, 1);
    assert.equal(document.versions[0]?.versionNumber, 1);

    const foreign = await prisma.document.findMany({
      where: { userId: userBId, id: document.id },
    });
    assert.equal(foreign.length, 0);

    assertOwnership(document.userId, userAId);
    assert.throws(
      () => assertOwnership(document.userId, userBId),
      (err: unknown) => err instanceof AppError && err.statusCode === 403,
    );
  });

  it("purchase has optional one-to-one warranty owned by the same user", async () => {
    const purchase = await prisma.purchase.create({
      data: {
        userId: userAId,
        name: "Laptop",
        purchasedOn: new Date("2026-01-10"),
        amount: "1200.00",
        vendor: "Example Store",
        warranty: {
          create: {
            userId: userAId,
            endsOn: new Date("2028-01-10"),
            provider: "Manufacturer",
          },
        },
      },
      include: { warranty: true },
    });

    assert.ok(purchase.warranty);
    assert.equal(purchase.warranty?.purchaseId, purchase.id);
    assert.equal(purchase.warranty?.userId, userAId);

    await assert.rejects(
      () =>
        prisma.warranty.create({
          data: {
            userId: userAId,
            purchaseId: purchase.id,
            endsOn: new Date("2029-01-10"),
          },
        }),
      /Unique constraint|P2002/,
    );
  });

  it("subscriptions and recurring payments are user-scoped commitments", async () => {
    const subscription = await prisma.subscription.create({
      data: {
        userId: userAId,
        name: "Streaming",
        billingInterval: "MONTHLY",
        amount: "15.00",
        nextBillingOn: new Date("2026-11-01"),
      },
    });
    const payment = await prisma.recurringPayment.create({
      data: {
        userId: userAId,
        name: "Internet",
        billingInterval: "MONTHLY",
        amount: "40.00",
        nextDueOn: new Date("2026-11-05"),
      },
    });

    assert.equal(subscription.userId, userAId);
    assert.equal(payment.userId, userAId);

    const bSubs = await prisma.subscription.count({ where: { userId: userBId } });
    assert.equal(bSubs, 0);
  });

  it("renewals and deadlines are user-scoped with optional document links", async () => {
    const doc = await prisma.document.create({
      data: {
        userId: userAId,
        title: "Insurance policy",
        category: "INSURANCE",
      },
    });

    const renewal = await prisma.renewal.create({
      data: {
        userId: userAId,
        title: "Health insurance renew",
        kind: "INSURANCE",
        dueOn: new Date("2026-12-01"),
        linkedDocumentId: doc.id,
      },
    });
    const deadline = await prisma.deadline.create({
      data: {
        userId: userAId,
        title: "Submit application",
        dueOn: new Date("2026-10-20"),
        linkedDocumentId: doc.id,
      },
    });

    assert.equal(renewal.linkedDocumentId, doc.id);
    assert.equal(deadline.linkedDocumentId, doc.id);
    assert.equal(renewal.userId, userAId);
    assert.equal(deadline.userId, userAId);
  });

  it("inbox, notification, and audit log rows are user-owned", async () => {
    const inbox = await prisma.inboxItem.create({
      data: { userId: userAId, title: "Unsorted scan" },
    });
    const notification = await prisma.notification.create({
      data: {
        userId: userAId,
        type: "DEADLINE",
        title: "Deadline approaching",
      },
    });
    const audit = await prisma.auditLog.create({
      data: {
        userId: userAId,
        action: "document.created",
        entityType: "Document",
        entityId: "example",
      },
    });

    assert.equal(inbox.userId, userAId);
    assert.equal(notification.userId, userAId);
    assert.equal(audit.userId, userAId);
  });

  it("declares the expected user-owned model set", () => {
    assert.deepEqual([...USER_OWNED_MODEL_NAMES].sort(), [
      "AuditLog",
      "Deadline",
      "Document",
      "InboxItem",
      "Notification",
      "Purchase",
      "RecurringPayment",
      "Renewal",
      "Subscription",
      "Warranty",
    ]);
  });
});
