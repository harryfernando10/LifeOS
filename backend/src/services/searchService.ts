import { prisma } from "../db/prisma.js";

export type SearchResult = { id: string; type: string; title: string; detail: string | null; href: string; updatedAt: string };

export async function searchForUser(userId: string, query: string) {
  const contains = (field: string) => ({ [field]: { contains: query, mode: "insensitive" as const } });
  const [documents, versions, subscriptions, payments, purchases, warranties, deadlines, renewals, inbox] = await Promise.all([
    prisma.document.findMany({ where: { userId, OR: [contains("title"), contains("description"), contains("notes")] }, select: { id: true, title: true, category: true, notes: true, updatedAt: true }, take: 20 }),
    prisma.documentVersion.findMany({ where: { document: { userId }, OR: [contains("originalFileName"), contains("notes")] }, select: { id: true, notes: true, originalFileName: true, uploadedAt: true, document: { select: { id: true, title: true } } }, take: 20 }),
    prisma.subscription.findMany({ where: { userId, OR: [contains("name"), contains("provider"), contains("notes")] }, select: { id: true, name: true, provider: true, notes: true, updatedAt: true }, take: 20 }),
    prisma.recurringPayment.findMany({ where: { userId, OR: [contains("name"), contains("payee"), contains("notes")] }, select: { id: true, name: true, payee: true, notes: true, updatedAt: true }, take: 20 }),
    prisma.purchase.findMany({ where: { userId, OR: [contains("name"), contains("vendor"), contains("notes")] }, select: { id: true, name: true, vendor: true, notes: true, updatedAt: true }, take: 20 }),
    prisma.warranty.findMany({ where: { userId, OR: [contains("provider"), contains("terms"), contains("notes")] }, select: { id: true, provider: true, terms: true, notes: true, updatedAt: true, purchase: { select: { id: true, name: true } } }, take: 20 }),
    prisma.deadline.findMany({ where: { userId, OR: [contains("title"), contains("notes")] }, select: { id: true, title: true, notes: true, updatedAt: true }, take: 20 }),
    prisma.renewal.findMany({ where: { userId, OR: [contains("title"), contains("notes")] }, select: { id: true, title: true, kind: true, notes: true, updatedAt: true }, take: 20 }),
    prisma.inboxItem.findMany({ where: { userId, OR: [contains("title"), contains("notes"), contains("originalFileName")] }, select: { id: true, title: true, notes: true, originalFileName: true, updatedAt: true }, take: 20 }),
  ]);
  const results: SearchResult[] = [
    ...documents.map(x => ({ id: x.id, type: "document", title: x.title, detail: [x.category.replaceAll("_", " "), x.notes].filter(Boolean).join(" · ") || null, href: "/app/vault", updatedAt: x.updatedAt.toISOString() })),
    ...versions.map(x => ({ id: x.id, type: "document_version", title: x.document.title, detail: [x.originalFileName, x.notes, "Document version"].filter(Boolean).join(" · "), href: "/app/vault", updatedAt: x.uploadedAt.toISOString() })),
    ...subscriptions.map(x => ({ id: x.id, type: "subscription", title: x.name, detail: [x.provider, x.notes].filter(Boolean).join(" · ") || null, href: "/app/commitments", updatedAt: x.updatedAt.toISOString() })),
    ...payments.map(x => ({ id: x.id, type: "recurring_payment", title: x.name, detail: [x.payee, x.notes].filter(Boolean).join(" · ") || null, href: "/app/commitments", updatedAt: x.updatedAt.toISOString() })),
    ...purchases.map(x => ({ id: x.id, type: "purchase", title: x.name, detail: [x.vendor, x.notes].filter(Boolean).join(" · ") || null, href: "/app/commitments", updatedAt: x.updatedAt.toISOString() })),
    ...warranties.map(x => ({ id: x.id, type: "warranty", title: x.purchase.name, detail: [x.provider, x.terms, x.notes].filter(Boolean).join(" · ") || null, href: "/app/commitments", updatedAt: x.updatedAt.toISOString() })),
    ...deadlines.map(x => ({ id: x.id, type: "deadline", title: x.title, detail: x.notes, href: "/app/renewals", updatedAt: x.updatedAt.toISOString() })),
    ...renewals.map(x => ({ id: x.id, type: "renewal", title: x.title, detail: [x.kind.replaceAll("_", " "), x.notes].filter(Boolean).join(" · "), href: "/app/renewals", updatedAt: x.updatedAt.toISOString() })),
    ...inbox.map(x => ({ id: x.id, type: "inbox_item", title: x.title ?? x.originalFileName ?? "Inbox item", detail: x.notes, href: "/app/inbox", updatedAt: x.updatedAt.toISOString() })),
  ];
  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
  return { query, results: results.slice(0, 100), total: Math.min(results.length, 100) };
}
