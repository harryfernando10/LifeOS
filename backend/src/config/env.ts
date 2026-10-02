import { isValidDatabaseUrl } from "../validators/envValidators.js";

export function getPort(): number {
  const raw = process.env.PORT ?? "3001";
  const port = Number(raw);
  return Number.isFinite(port) && port > 0 ? port : 3001;
}

export function getFrontendOrigin(): string {
  return process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
}

/**
 * Returns DATABASE_URL from the environment.
 * Throws if missing or not a postgresql/postgres URL. Never logs the value.
 */
export function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!isValidDatabaseUrl(value)) {
    throw new Error(
      "DATABASE_URL is missing or invalid. Set it in backend/.env (see backend/.env.example).",
    );
  }
  return value;
}
