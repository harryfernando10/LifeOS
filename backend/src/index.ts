import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getFrontendOrigin, getPort } from "./config/env.js";
import { disconnectPrisma } from "./db/prisma.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: getFrontendOrigin(),
  }),
);
app.use(express.json());
app.use("/api", apiRouter);
app.use(errorHandler);

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
