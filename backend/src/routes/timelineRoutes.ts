import { Router } from "express";
import { getTimeline } from "../controllers/timelineController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const timelineRouter = Router();

timelineRouter.use(requireAuth);
timelineRouter.get("/timeline", getTimeline);
