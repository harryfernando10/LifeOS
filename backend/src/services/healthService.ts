import { checkDatabaseReadiness } from "./databaseService.js";

export type HealthStatus = {
  status: "ok";
  service: "lifeos-backend";
};

export type ReadinessStatus = {
  status: "ready" | "not_ready";
  service: "lifeos-backend";
  database: "up" | "down" | "unconfigured";
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "lifeos-backend",
  };
}

export async function getReadinessStatus(): Promise<ReadinessStatus> {
  const db = await checkDatabaseReadiness();

  if (!db.configured) {
    return {
      status: "not_ready",
      service: "lifeos-backend",
      database: "unconfigured",
    };
  }

  if (!db.connected) {
    return {
      status: "not_ready",
      service: "lifeos-backend",
      database: "down",
    };
  }

  return {
    status: "ready",
    service: "lifeos-backend",
    database: "up",
  };
}
