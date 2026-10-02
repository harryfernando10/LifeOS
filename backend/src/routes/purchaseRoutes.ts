import { Router } from "express";
import {
  createPurchase,
  deletePurchase,
  deleteWarranty,
  getPurchase,
  listPurchases,
  updatePurchase,
  upsertWarranty,
} from "../controllers/purchaseController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const purchaseRouter = Router();

purchaseRouter.use(requireAuth);

purchaseRouter.get("/purchases", listPurchases);
purchaseRouter.post("/purchases", createPurchase);
purchaseRouter.get("/purchases/:id", getPurchase);
purchaseRouter.patch("/purchases/:id", updatePurchase);
purchaseRouter.delete("/purchases/:id", deletePurchase);

purchaseRouter.put("/purchases/:id/warranty", upsertWarranty);
purchaseRouter.delete("/purchases/:id/warranty", deleteWarranty);
