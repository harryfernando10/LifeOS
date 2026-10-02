import { Router } from "express";
import { login, logout, me, register } from "../controllers/authController.js";
import { authRateLimiter } from "../middleware/authRateLimit.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

authRouter.post("/auth/register", authRateLimiter, register);
authRouter.post("/auth/login", authRateLimiter, login);
authRouter.post("/auth/logout", logout);
authRouter.get("/auth/me", requireAuth, me);
