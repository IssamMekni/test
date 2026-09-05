import { createGoogleAuthorizationUrl } from "../../../../../features/auth/auth.service";

type RouteContext = {
  params: {
    locale: string;
  };
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const requestUrl = new URL(request.url);
    const redirectUri = `${requestUrl.origin}/${context.params.locale}/api/auth/google/callback`;
    const redirectTo = requestUrl.searchParams.get("redirectTo");
    const { url } = createGoogleAuthorizationUrl({
      redirectUri,
      redirectTo,
    });

    return Response.redirect(url, 302);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "failed to start Google sign in",
      },
      { status: 400 },
    );
  }
}
