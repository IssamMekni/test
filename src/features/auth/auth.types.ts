export type AuthProvider = "password" | "google";

export type CredentialsInput = {
  email: string;
  password: string;
};

export type RegisterInput = CredentialsInput & {
  name?: string;
};

export type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  provider: AuthProvider;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  expiresAt: string;
};

export type GoogleOAuthState = {
  nonce: string;
  redirectTo: string;
};

export type AuthConfig = {
  googleClientId: string;
  googleClientSecret: string;
};