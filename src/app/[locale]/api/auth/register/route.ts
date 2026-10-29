import {
  createSessionCookie,
  jsonResponse,
} from "../../../../../features/auth/auth.http";
import { parseRegisterInput } from "../../../../../features/auth/auth.schema";
import { registerWithPassword } from "../../../../../features/auth/auth.service";

async function getPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

export async function POST(request: Request) {
  try {
    const payload = parseRegisterInput(await getPayload(request));
    const session = registerWithPassword(payload);

    return jsonResponse(
      {
        ok: true,
        user: session.user,
      },
      {
        status: 201,
        headers: {
          "set-cookie": createSessionCookie(session.token, session.expiresAt),
        },
      },
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "failed to register",
      },
      { status: 400 },
    );
  }
}
