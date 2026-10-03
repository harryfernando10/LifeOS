import { Router } from "express";
import { analyzeDocument, analyzeInbox, confirmInboxDocument } from "../controllers/aiController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);
aiRouter.post("/ai/inbox/:id/process", analyzeInbox);
aiRouter.post("/ai/inbox/:id/confirm-document", confirmInboxDocument);
aiRouter.post("/ai/documents/:id/process", analyzeDocument);
