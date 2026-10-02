import { Router } from "express";
import {
  createDocument,
  deleteDocument,
  downloadDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from "../controllers/documentController.js";
import { documentUploadMiddleware } from "../middleware/documentUpload.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const documentRouter = Router();

documentRouter.use(requireAuth);

documentRouter.get("/documents", listDocuments);
documentRouter.get("/documents/:id", getDocument);
documentRouter.post("/documents", documentUploadMiddleware, createDocument);
documentRouter.patch("/documents/:id", updateDocument);
documentRouter.delete("/documents/:id", deleteDocument);
documentRouter.get("/documents/:id/download", downloadDocument);
