export type ApiError = {
  error: string;
  code?: string;
  status: number;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || "/api";
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiRequestError(
      "Unable to reach the server. Check that the backend is running.",
      0,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? ((await response.json()) as unknown) : null;

  if (!response.ok) {
    const body = payload as ApiError | null;
    throw new ApiRequestError(
      body?.error ?? "Request failed.",
      response.status,
      body?.code,
    );
  }

  return payload as T;
}
