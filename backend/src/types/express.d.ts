import type { AuthenticatedRequestUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      /** Populated by requireAuth. Never includes password hashes or secrets. */
      authUser?: AuthenticatedRequestUser;
    }
  }
}

export {};
