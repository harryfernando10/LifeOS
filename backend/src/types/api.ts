export type ApiErrorBody = {
  error: string;
};

export type HealthResponseBody = {
  status: "ok";
  service: "lifeos-backend";
};

export type ReadyResponseBody = {
  status: "ready" | "not_ready";
  service: "lifeos-backend";
  database: "up" | "down" | "unconfigured";
};
