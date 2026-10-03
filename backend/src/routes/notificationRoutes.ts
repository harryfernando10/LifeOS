import { Router } from "express";
import { getNotifications, markAllNotifications, markNotification } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get("/notifications", getNotifications);
notificationRouter.patch("/notifications/read-all", markAllNotifications);
notificationRouter.patch("/notifications/:id/read", markNotification);
