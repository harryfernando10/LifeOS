import rateLimit from "express-rate-limit";

/**
 * Baseline rate limit for authentication endpoints.
 * Authentication throttling is part of the final security baseline.
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
