import rateLimit from "express-rate-limit";

/**
 * Baseline rate limit for authentication endpoints.
 * Hardening continues in Phase 19.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again later.",
    code: "RATE_LIMITED",
  },
});
