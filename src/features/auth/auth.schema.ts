import type { CredentialsInput, RegisterInput } from "./auth.types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeEmail(email: string): string {
  const normalized = email.toLowerCase();

  if (!EMAIL_REGEX.test(normalized)) {
    throw new Error("email is invalid");
  }

  return normalized;
}

export function parseCredentialsInput(value: unknown): CredentialsInput {
  if (!isRecord(value)) {
    throw new Error("payload must be an object");
  }

  const email = normalizeEmail(asString(value.email, "email"));
  const password = asString(value.password, "password");

  return { email, password };
}

export function parseRegisterInput(value: unknown): RegisterInput {
  if (!isRecord(value)) {
    throw new Error("payload must be an object");
  }

  const credentials = parseCredentialsInput(value);
  const name =
    typeof value.name === "string" && value.name.trim().length > 0
      ? value.name.trim()
      : undefined;

  return {
    ...credentials,
    name,
  };
}

export function parseAuthorizationHeader(value: string | null): string {
  if (!value) {
    throw new Error("missing authorization header");
  }

  const [scheme, token] = value.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new Error("authorization header must include scheme and token");
  }

  return token;
}