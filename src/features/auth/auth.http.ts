import { parseAuthorizationHeader } from "./auth.schema";

export const SESSION_COOKIE_NAME = "auth_session";

function serializeCookie(params: {
  name: string;
  value: string;
  expires?: string;
  maxAge?: number;
}) {
  const segments = [`${params.name}=${params.value}`, "Path=/", "HttpOnly", "SameSite=Lax"];

  if (params.expires) {
    segments.push(`Expires=${new Date(params.expires).toUTCString()}`);
  }

  if (typeof params.maxAge === "number") {
    segments.push(`Max-Age=${params.maxAge}`);
  }

  return segments.join("; ");
}

export function createSessionCookie(token: string, expiresAt: string): string {
  return serializeCookie({
    name: SESSION_COOKIE_NAME,
    value: token,
    expires: expiresAt,
  });
}

export function clearSessionCookie(): string {
  return serializeCookie({
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
  });
}

export function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");

  if (cookieHeader) {
    const cookieToken = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.split("=")[1];

    if (cookieToken) {
      return cookieToken;
    }
  }

  try {
    return parseAuthorizationHeader(request.headers.get("authorization"));
  } catch {
    return null;
  }
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
