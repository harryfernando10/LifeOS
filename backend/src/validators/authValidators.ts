import { isNonEmptyString } from "../utils/strings.js";
import { AppError } from "../errors/AppError.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt effective limit

export type AuthCredentialsInput = {
  email: string;
  password: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseAuthCredentials(body: unknown): AuthCredentialsInput {
  if (body === null || typeof body !== "object") {
    throw new AppError(400, "Invalid request body.", "VALIDATION_ERROR");
  }

  const record = body as Record<string, unknown>;
  const emailRaw = record.email;
  const passwordRaw = record.password;

  if (!isNonEmptyString(emailRaw)) {
    throw new AppError(400, "Email is required.", "VALIDATION_ERROR");
  }

  if (!isNonEmptyString(passwordRaw)) {
    throw new AppError(400, "Password is required.", "VALIDATION_ERROR");
  }

  const email = normalizeEmail(emailRaw);
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new AppError(400, "Email is invalid.", "VALIDATION_ERROR");
  }

  const password = passwordRaw;
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AppError(
      400,
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
      "VALIDATION_ERROR",
    );
  }

  return { email, password };
}

export { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH };
