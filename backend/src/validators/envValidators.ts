import { isNonEmptyString } from "../utils/strings.js";

/** Basic DATABASE_URL shape check (postgresql://...). Does not validate credentials. */
export function isValidDatabaseUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "postgresql:" || url.protocol === "postgres:";
  } catch {
    return false;
  }
}
