export type HealthStatus = {
  status: "ok";
  service: "lifeos-backend";
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "lifeos-backend",
  };
}
