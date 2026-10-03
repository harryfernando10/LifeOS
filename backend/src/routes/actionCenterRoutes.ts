import { Router } from "express";
import { getActionCenter } from "../controllers/actionCenterController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const actionCenterRouter = Router();

actionCenterRouter.use(requireAuth);
actionCenterRouter.get("/action-center", getActionCenter);
