import { Router } from "express";
import { authRouter } from "./authRoutes.js";
import { healthRouter } from "./healthRoutes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
