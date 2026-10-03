import { Router } from "express";
import { createInbox, downloadInboxFile, getInbox, listInbox, removeInbox, search, triageInbox, updateInbox } from "../controllers/searchInboxController.js";
import { documentUploadMiddleware } from "../middleware/documentUpload.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const searchInboxRouter = Router();
searchInboxRouter.use(requireAuth);
searchInboxRouter.get("/search", search);
searchInboxRouter.get("/inbox", listInbox);
searchInboxRouter.post("/inbox", documentUploadMiddleware, createInbox);
searchInboxRouter.get("/inbox/:id/download", downloadInboxFile);
searchInboxRouter.get("/inbox/:id", getInbox);
searchInboxRouter.patch("/inbox/:id", updateInbox);
searchInboxRouter.patch("/inbox/:id/triage", triageInbox);
searchInboxRouter.delete("/inbox/:id", removeInbox);
