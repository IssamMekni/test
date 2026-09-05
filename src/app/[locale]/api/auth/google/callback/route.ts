import { createSessionCookie } from "../../../../../../features/auth/auth.http";
import { loginWithGoogle } from "../../../../../../features/auth/auth.service";

type RouteContext = {
  params: {
    locale: string;
  };
};

function errorResponse(message: string): Response {
  return Response.json(
    {
      ok: false,
      error: message,
    },
    { status: 400 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  if (!code || !state) {
    return errorResponse("missing Google OAuth callback parameters");
  }

  try {
    const redirectUri = `${requestUrl.origin}/${context.params.locale}/api/auth/google/callback`;
    const { session, redirectTo } = await loginWithGoogle({
      code,
      state,
      redirectUri,
    });
    const safeRedirectTarget = new URL(redirectTo, requestUrl.origin).toString();

    return new Response(null, {
      status: 302,
      headers: {
        Location: safeRedirectTarget,
        "set-cookie": createSessionCookie(session.token, session.expiresAt),
      },
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "failed to complete Google sign in");
  }
}
