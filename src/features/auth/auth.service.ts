import {
  consumeGoogleOAuthState,
  createGoogleUser,
  createPasswordUser,
  createSession,
  deleteSession,
  findUserByEmail,
  saveGoogleOAuthState,
  verifyPasswordUser,
} from "./auth.repository";
import type {
  AuthConfig,
  AuthSession,
  CredentialsInput,
  GoogleProfile,
  RegisterInput,
} from "./auth.types";

type OAuthTokenResponse = {
  access_token: string;
};

function getAuthConfig(): AuthConfig {
  const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

  if (!googleClientId || !googleClientSecret) {
    throw new Error("Google OAuth is not configured");
  }

  return { googleClientId, googleClientSecret };
}

function asPublicUser<T extends { passwordHash?: string }>(user: T) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function registerWithPassword(input: RegisterInput): AuthSession {
  if (findUserByEmail(input.email)) {
    throw new Error("email is already registered");
  }

  const user = createPasswordUser(input);
  return createSession(asPublicUser(user));
}

export function loginWithPassword(input: CredentialsInput): AuthSession {
  const user = verifyPasswordUser(input.email, input.password);

  if (!user) {
    throw new Error("invalid email or password");
  }

  return createSession(asPublicUser(user));
}

export function logout(token: string): void {
  deleteSession(token);
}

export function createGoogleAuthorizationUrl(params: {
  redirectUri: string;
  redirectTo?: string | null;
}) {
  const { googleClientId } = getAuthConfig();
  const state = saveGoogleOAuthState(params.redirectTo ?? "/");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", googleClientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state.nonce);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return { url: url.toString(), state };
}

async function exchangeCodeForAccessToken(params: {
  code: string;
  redirectUri: string;
}): Promise<string> {
  const { googleClientId, googleClientSecret } = getAuthConfig();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code: params.code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("failed to exchange google authorization code");
  }

  const body = (await response.json()) as OAuthTokenResponse;

  if (!body.access_token) {
    throw new Error("missing Google access token");
  }

  return body.access_token;
}

async function getGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const authHeader = ["Bearer", accessToken].join(" ");
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("failed to fetch google user profile");
  }

  const profile = (await response.json()) as Partial<GoogleProfile>;

  if (!profile.sub || !profile.email) {
    throw new Error("google profile is incomplete");
  }

  return {
    sub: profile.sub,
    email: profile.email.toLowerCase(),
    name: profile.name,
  };
}

export async function loginWithGoogle(params: {
  code: string;
  state: string;
  redirectUri: string;
}): Promise<{ session: AuthSession; redirectTo: string }> {
  const savedState = consumeGoogleOAuthState(params.state);

  if (!savedState) {
    throw new Error("invalid oauth state");
  }

  const accessToken = await exchangeCodeForAccessToken({
    code: params.code,
    redirectUri: params.redirectUri,
  });
  const profile = await getGoogleProfile(accessToken);
  const user = createGoogleUser(profile);
  const session = createSession(asPublicUser(user));

  return {
    session,
    redirectTo: savedState.redirectTo,
  };
}