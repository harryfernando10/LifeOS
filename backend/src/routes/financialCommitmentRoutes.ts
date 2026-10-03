import { Router } from "express";
import { getFinancialCommitments } from "../controllers/financialCommitmentController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const financialCommitmentRouter = Router();

financialCommitmentRouter.use(requireAuth);
financialCommitmentRouter.get("/financial-commitments", getFinancialCommitments);
