import {
  clearSessionCookie,
  jsonResponse,
  readSessionToken,
} from "../../../../../features/auth/auth.http";
import { logout } from "../../../../../features/auth/auth.service";

export async function POST(request: Request) {
  const token = readSessionToken(request);

  if (token) {
    logout(token);
  }

  return jsonResponse(
    {
      ok: true,
    },
    {
      status: 200,
      headers: {
        "set-cookie": clearSessionCookie(),
      },
    },
  );
}
