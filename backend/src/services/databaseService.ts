import { prisma } from "../db/prisma.js";
import { getDatabaseUrl } from "../config/env.js";

export type DatabaseReadiness = {
  configured: boolean;
  connected: boolean;
};

/**
 * Checks whether DATABASE_URL is set and whether PostgreSQL accepts a query.
 * Does not return connection strings, credentials, or raw driver errors.
 */
export async function checkDatabaseReadiness(): Promise<DatabaseReadiness> {
  let configured = false;
  try {
    getDatabaseUrl();
    configured = true;
  } catch {
    return { configured: false, connected: false };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { configured: true, connected: true };
  } catch {
    return { configured: true, connected: false };
  }
}
