import { Router } from "express";
import { actionCenterRouter } from "./actionCenterRoutes.js";
import { authRouter } from "./authRoutes.js";
import { commitmentRouter } from "./commitmentRoutes.js";
import { documentRouter } from "./documentRoutes.js";
import { financialCommitmentRouter } from "./financialCommitmentRoutes.js";
import { healthRouter } from "./healthRoutes.js";
import { purchaseRouter } from "./purchaseRoutes.js";
import { renewalDeadlineRouter } from "./renewalDeadlineRoutes.js";
import { timelineRouter } from "./timelineRoutes.js";
import { searchInboxRouter } from "./searchInboxRoutes.js";
import { aiRouter } from "./aiRoutes.js";
import { notificationRouter } from "./notificationRoutes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(documentRouter);
apiRouter.use(commitmentRouter);
apiRouter.use(purchaseRouter);
apiRouter.use(renewalDeadlineRouter);
apiRouter.use(actionCenterRouter);
apiRouter.use(timelineRouter);
apiRouter.use(financialCommitmentRouter);
apiRouter.use(searchInboxRouter);
apiRouter.use(aiRouter);
apiRouter.use(notificationRouter);
