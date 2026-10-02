export type ApiErrorBody = {
  error: string;
  code?: string;
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

export type AuthUserResponseBody = {
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
};
