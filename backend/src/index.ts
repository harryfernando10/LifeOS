import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getFrontendOrigin, getPort } from "./config/env.js";
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

app.listen(port, () => {
  console.log(`LifeOS backend listening on http://localhost:${port}`);
});
