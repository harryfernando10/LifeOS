import { Router } from "express";
import {
  createDeadline,
  deleteDeadline,
  getDeadline,
  listDeadlines,
  updateDeadline,
} from "../controllers/deadlineController.js";
import {
  createRenewal,
  deleteRenewal,
  getRenewal,
  listRenewals,
  updateRenewal,
} from "../controllers/renewalController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const renewalDeadlineRouter = Router();

renewalDeadlineRouter.use(requireAuth);

renewalDeadlineRouter.get("/renewals", listRenewals);
renewalDeadlineRouter.post("/renewals", createRenewal);
renewalDeadlineRouter.get("/renewals/:id", getRenewal);
renewalDeadlineRouter.patch("/renewals/:id", updateRenewal);
renewalDeadlineRouter.delete("/renewals/:id", deleteRenewal);

renewalDeadlineRouter.get("/deadlines", listDeadlines);
renewalDeadlineRouter.post("/deadlines", createDeadline);
renewalDeadlineRouter.get("/deadlines/:id", getDeadline);
renewalDeadlineRouter.patch("/deadlines/:id", updateDeadline);
renewalDeadlineRouter.delete("/deadlines/:id", deleteDeadline);
