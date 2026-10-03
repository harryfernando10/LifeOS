import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

dotenv.config();
const emails = [`phase15-a-${Date.now()}@example.com`, `phase15-b-${Date.now()}@example.com`];
const password = "securepass1";
let server: Server; let base = ""; let cookies = ["", ""]; let userIds = ["", ""];
function session(response: Response) { const raw = response.headers.get("set-cookie") ?? ""; const found = /lifeos\.sid=([^;]+)/.exec(raw); return found ? `lifeos.sid=${found[1]}` : ""; }
async function api(path: string, init: RequestInit = {}, cookie = cookies[0]) { const headers = new Headers(init.headers); if (cookie) headers.set("Cookie", cookie); if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json"); return fetch(`${base}${path}`, { ...init, headers }); }
function dateIn(days: number) { const d = new Date(); const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); day.setUTCDate(day.getUTCDate() + days); return day; }

describe("Phase 15 notifications", () => {
  before(async () => {
    server = createApp().listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing test server address"); base = `http://127.0.0.1:${address.port}/api`;
    for (let i = 0; i < emails.length; i++) { const response = await api("/auth/register", { method: "POST", body: JSON.stringify({ email: emails[i], password }) }, ""); assert.equal(response.status, 201); cookies[i] = session(response); userIds[i] = ((await response.json()) as { user: { id: string } }).user.id; }
  });
  after(async () => { await prisma.user.deleteMany({ where: { email: { in: emails } } }); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await prisma.$disconnect(); });

  it("requires auth, derives Action Center notifications once, and scopes them to their owner", async () => {
    assert.equal((await api("/notifications", {}, "")).status, 401);
    await prisma.deadline.create({ data: { userId: userIds[0], title: "Phase15 due today", dueOn: dateIn(0) } });
    await prisma.subscription.create({ data: { userId: userIds[0], name: "Phase15 upcoming subscription", billingInterval: "MONTHLY", nextBillingOn: dateIn(4) } });
    await prisma.deadline.create({ data: { userId: userIds[1], title: "Foreign Phase15 deadline", dueOn: dateIn(0) } });
    const first = await api("/notifications"); assert.equal(first.status, 200);
    const result = await first.json() as { items: Array<{ id: string; title: string; body: string | null; dueOn: string; href: string; readAt: string | null }>; unreadCount: number };
    const item = result.items.find(row => row.title === "Phase15 due today"); assert.ok(item); assert.equal(item.dueOn, dateIn(0).toISOString().slice(0, 10)); assert.equal(item.href, "/app/renewals?tab=deadlines"); assert.match(item.body ?? "", /^Due today/); assert.equal(item.readAt, null); assert.equal(result.unreadCount, 2);
    const upcoming = result.items.find(row => row.title === "Phase15 upcoming subscription"); assert.ok(upcoming); assert.match(upcoming.body ?? "", /^Upcoming/); assert.equal(upcoming.href, "/app/commitments");
    const second = await (await api("/notifications")).json() as typeof result; assert.equal(second.items.filter(row => row.title === "Phase15 due today").length, 1, "derived source/date key deduplicates repeated reads");
    const forB = await (await api("/notifications", {}, cookies[1])).json() as typeof result; assert.ok(!forB.items.some(row => row.title === "Phase15 due today"));
    assert.equal((await api(`/notifications/${item.id}/read`, { method: "PATCH" }, cookies[1])).status, 404);
    assert.equal((await api(`/notifications/${item.id}/read`, { method: "PATCH" })).status, 204);
    const afterRead = await (await api("/notifications")).json() as typeof result; assert.equal(afterRead.unreadCount, 1); assert.ok(afterRead.items.find(row => row.id === item.id)?.readAt);
    assert.equal((await api("/notifications/read-all", { method: "PATCH" })).status, 204);
    assert.equal(((await (await api("/notifications")).json()) as typeof result).unreadCount, 0);
    assert.equal(((await (await api("/notifications", {}, cookies[1])).json()) as typeof result).unreadCount, 1, "mark-all-read is owner-scoped");
  });
});
