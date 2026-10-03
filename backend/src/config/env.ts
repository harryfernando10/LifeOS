import { isValidDatabaseUrl } from "../validators/envValidators.js";
import { isNonEmptyString } from "../utils/strings.js";

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

/**
 * Secret used to sign the session cookie. Never log this value.
 */
export function getSessionSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!isNonEmptyString(value) || value.trim().length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short (min 32 characters). Set it in backend/.env.",
    );
  }
  return value.trim();
}

export function getSessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME?.trim() || "lifeos.sid";
}

/** Session lifetime in milliseconds (default 7 days). */
export function getSessionMaxAgeMs(): number {
  const raw = process.env.SESSION_MAX_AGE_MS;
  if (!raw) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  return parsed;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Absolute path to the private document storage root.
 * Defaults to ../private-storage relative to the backend working directory.
 */
export function getPrivateStorageRoot(): string {
  const configured = process.env.PRIVATE_STORAGE_ROOT?.trim();
  if (configured) {
    return configured;
  }
  return "../private-storage";
}

/** Maximum upload size in bytes (default 10 MiB). */
export function getMaxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_BYTES;
  if (!raw) {
    return 10 * 1024 * 1024;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 10 * 1024 * 1024;
  }
  return Math.floor(parsed);
}

export function getAiServiceUrl(): string | null {
  return process.env.AI_SERVICE_URL?.trim().replace(/\/$/, "") || null;
}

export function getAiServiceToken(): string | null {
  return process.env.AI_SERVICE_TOKEN?.trim() || null;
}
