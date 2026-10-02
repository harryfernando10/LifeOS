import { Router } from "express";
import {
  createRecurringPayment,
  deleteRecurringPayment,
  getRecurringPayment,
  listRecurringPayments,
  updateRecurringPayment,
} from "../controllers/recurringPaymentController.js";
import {
  createSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  updateSubscription,
} from "../controllers/subscriptionController.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const commitmentRouter = Router();

commitmentRouter.use(requireAuth);

commitmentRouter.get("/subscriptions", listSubscriptions);
commitmentRouter.post("/subscriptions", createSubscription);
commitmentRouter.get("/subscriptions/:id", getSubscription);
commitmentRouter.patch("/subscriptions/:id", updateSubscription);
commitmentRouter.delete("/subscriptions/:id", deleteSubscription);

commitmentRouter.get("/recurring-payments", listRecurringPayments);
commitmentRouter.post("/recurring-payments", createRecurringPayment);
commitmentRouter.get("/recurring-payments/:id", getRecurringPayment);
commitmentRouter.patch("/recurring-payments/:id", updateRecurringPayment);
commitmentRouter.delete("/recurring-payments/:id", deleteRecurringPayment);
