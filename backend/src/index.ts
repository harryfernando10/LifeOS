import dotenv from "dotenv";
import { createApp } from "./app.js";
import { getPort } from "./config/env.js";
import { disconnectPrisma } from "./db/prisma.js";

dotenv.config();

const app = createApp();
const port = getPort();

const server = app.listen(port, () => {
  console.log(`LifeOS backend listening on http://localhost:${port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => {
    try {
      await disconnectPrisma();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
