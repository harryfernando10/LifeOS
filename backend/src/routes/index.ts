import { Router } from "express";
import { authRouter } from "./authRoutes.js";
import { commitmentRouter } from "./commitmentRoutes.js";
import { documentRouter } from "./documentRoutes.js";
import { healthRouter } from "./healthRoutes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(documentRouter);
apiRouter.use(commitmentRouter);
