import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { getFrontendOrigin } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { validateRequestOrigin } from "./middleware/validateRequestOrigin.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: getFrontendOrigin(),
      credentials: true,
    }),
  );
  app.use(validateRequestOrigin);
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}
