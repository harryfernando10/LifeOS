import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import dotenv from "dotenv";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { hashPassword } from "../utils/password.js";

dotenv.config();

const TEST_EMAIL_A = `phase3-a-${Date.now()}@example.com`;
const TEST_EMAIL_B = `phase3-b-${Date.now()}@example.com`;
const PASSWORD = "securepass1";

let server: Server;
let baseUrl: string;
let sessionCookie = "";

function extractSessionCookie(response: Response): string | null {
  // Node fetch may expose getSetCookie(); fall back to headers.get.
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
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (sessionCookie) {
    headers.set("Cookie", sessionCookie);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

describe("Phase 3 authentication", () => {
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
  });

  after(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [TEST_EMAIL_A, TEST_EMAIL_B] },
      },
    });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await prisma.$disconnect();
  });

  it("rejects invalid registration input", async () => {
    const response = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error: string; code?: string };
    assert.ok(body.error);
    assert.equal(body.code, "VALIDATION_ERROR");
  });

  it("registers a user and stores a hashed password", async () => {
    const response = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL_A, password: PASSWORD }),
    });
    assert.equal(response.status, 201);
    const body = (await response.json()) as {
      user: { id: string; email: string; passwordHash?: string };
    };
    assert.equal(body.user.email, TEST_EMAIL_A);
    assert.equal(body.user.passwordHash, undefined);
    assert.ok(!("password" in body.user));

    const cookie = extractSessionCookie(response);
    assert.ok(cookie, "expected HTTP-only session cookie");
    sessionCookie = cookie;

    const row = await prisma.user.findUnique({
      where: { email: TEST_EMAIL_A },
      select: { passwordHash: true },
    });
    assert.ok(row);
    assert.notEqual(row.passwordHash, PASSWORD);
    assert.match(row.passwordHash, /^\$2[aby]\$/);
  });

  it("rejects duplicate registration", async () => {
    const response = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL_A, password: PASSWORD }),
    });
    assert.equal(response.status, 409);
  });

  it("returns the authenticated user from /auth/me", async () => {
    const response = await api("/auth/me");
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      user: { email: string; passwordHash?: string };
    };
    assert.equal(body.user.email, TEST_EMAIL_A);
    assert.equal(body.user.passwordHash, undefined);
  });

  it("rejects unauthenticated access to /auth/me", async () => {
    const previous = sessionCookie;
    sessionCookie = "";
    const response = await api("/auth/me");
    sessionCookie = previous;
    assert.equal(response.status, 401);
  });

  it("logs in with correct credentials", async () => {
    sessionCookie = "";
    const response = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL_A, password: PASSWORD }),
    });
    assert.equal(response.status, 200);
    const cookie = extractSessionCookie(response);
    assert.ok(cookie);
    sessionCookie = cookie;
  });

  it("fails login with incorrect credentials without leaking existence", async () => {
    const wrongPassword = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL_A, password: "wrongpass1" }),
    });
    assert.equal(wrongPassword.status, 401);
    const wrongBody = (await wrongPassword.json()) as { error: string };
    assert.equal(wrongBody.error, "Invalid email or password.");

    const missingUser = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "nobody-phase3@example.com",
        password: "wrongpass1",
      }),
    });
    assert.equal(missingUser.status, 401);
    const missingBody = (await missingUser.json()) as { error: string };
    assert.equal(missingBody.error, "Invalid email or password.");
  });

  it("logs out and invalidates the session", async () => {
    const logoutResponse = await api("/auth/logout", { method: "POST" });
    assert.equal(logoutResponse.status, 204);

    const meResponse = await api("/auth/me");
    assert.equal(meResponse.status, 401);
    sessionCookie = "";
  });

  it("never returns password hashes from auth endpoints", async () => {
    await prisma.user.create({
      data: {
        email: TEST_EMAIL_B,
        passwordHash: await hashPassword(PASSWORD),
      },
    });

    const loginResponse = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL_B, password: PASSWORD }),
    });
    assert.equal(loginResponse.status, 200);
    const loginBody = await loginResponse.text();
    assert.equal(loginBody.includes("passwordHash"), false);
    assert.equal(loginBody.includes("password_hash"), false);
    assert.equal(loginBody.includes("$2b$"), false);

    const cookie = extractSessionCookie(loginResponse);
    assert.ok(cookie);
    sessionCookie = cookie;

    const meResponse = await api("/auth/me");
    const meBody = await meResponse.text();
    assert.equal(meBody.includes("passwordHash"), false);
    assert.equal(meBody.includes("$2b$"), false);
  });
});
