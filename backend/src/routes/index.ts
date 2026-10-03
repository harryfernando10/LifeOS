import { Router } from "express";
import { actionCenterRouter } from "./actionCenterRoutes.js";
import { authRouter } from "./authRoutes.js";
import { commitmentRouter } from "./commitmentRoutes.js";
import { documentRouter } from "./documentRoutes.js";
import { healthRouter } from "./healthRoutes.js";
import { purchaseRouter } from "./purchaseRoutes.js";
import { renewalDeadlineRouter } from "./renewalDeadlineRoutes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(documentRouter);
apiRouter.use(commitmentRouter);
apiRouter.use(purchaseRouter);
apiRouter.use(renewalDeadlineRouter);
apiRouter.use(actionCenterRouter);
