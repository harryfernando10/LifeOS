import { apiRequest } from "./client";

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

type UserResponse = {
  user: AuthUser;
};

export async function registerAccount(
  email: string,
  password: string,
): Promise<AuthUser> {
  const body = await apiRequest<UserResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return body.user;
}

export async function loginAccount(
  email: string,
  password: string,
): Promise<AuthUser> {
  const body = await apiRequest<UserResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return body.user;
}

export async function logoutAccount(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const body = await apiRequest<UserResponse>("/auth/me");
  return body.user;
}
