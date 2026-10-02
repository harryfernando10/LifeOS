import { Router } from "express";
import {
  createDocument,
  createDocumentVersion,
  deleteDocument,
  downloadDocument,
  downloadDocumentVersion,
  getDocument,
  listDocumentVersions,
  listDocuments,
  updateDocument,
} from "../controllers/documentController.js";
import { documentUploadMiddleware } from "../middleware/documentUpload.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const documentRouter = Router();

documentRouter.use(requireAuth);

documentRouter.get("/documents", listDocuments);
documentRouter.post("/documents", documentUploadMiddleware, createDocument);
documentRouter.get("/documents/:id/versions", listDocumentVersions);
documentRouter.post(
  "/documents/:id/versions",
  documentUploadMiddleware,
  createDocumentVersion,
);
documentRouter.get(
  "/documents/:id/versions/:versionId/download",
  downloadDocumentVersion,
);
documentRouter.get("/documents/:id/download", downloadDocument);
documentRouter.get("/documents/:id", getDocument);
documentRouter.patch("/documents/:id", updateDocument);
documentRouter.delete("/documents/:id", deleteDocument);
