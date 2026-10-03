import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import { createApp } from "../app.js";

describe("state-changing request origin validation", () => {
  const originalOrigin = process.env.FRONTEND_ORIGIN;
  let server: Server;
  let baseUrl: string;

  before(async () => {
    process.env.FRONTEND_ORIGIN = "http://localhost:5173";
    await new Promise<void>((resolve) => {
      server = createApp().listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not start");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (originalOrigin === undefined) delete process.env.FRONTEND_ORIGIN;
    else process.env.FRONTEND_ORIGIN = originalOrigin;
  });

  it("rejects state-changing requests from a different origin", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { Origin: "http://localhost:5174", "Content-Type": "application/json" },
      body: "{}",
    });

    assert.equal(response.status, 403);
    assert.equal((await response.json() as { code: string }).code, "ORIGIN_NOT_ALLOWED");
  });

  it("allows the configured SPA origin and clients without an Origin header", async () => {
    const allowedOrigin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { Origin: "http://localhost:5173", "Content-Type": "application/json" },
      body: "{}",
    });
    const noOrigin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    // Both requests reach normal route validation instead of being blocked.
    assert.equal(allowedOrigin.status, 400);
    assert.equal(noOrigin.status, 400);
  });
});
