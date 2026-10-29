import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AuthSession, AuthUser, GoogleOAuthState, RegisterInput } from "./auth.types";

type StoredUser = AuthUser & {
  passwordHash?: string;
};

const usersByEmail = new Map<string, StoredUser>();
const sessionsByToken = new Map<string, AuthSession>();
const oauthStateByNonce = new Map<string, GoogleOAuthState>();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function findUserByEmail(email: string): StoredUser | null {
  return usersByEmail.get(email) ?? null;
}

export function createPasswordUser(input: RegisterInput): StoredUser {
  const user: StoredUser = {
    id: randomUUID(),
    email: input.email,
    name: input.name,
    provider: "password",
    passwordHash: hashPassword(input.password),
  };

  usersByEmail.set(user.email, user);
  return user;
}

export function createGoogleUser(profile: { sub: string; email: string; name?: string }): StoredUser {
  const existing = usersByEmail.get(profile.email);

  if (existing) {
    const merged: StoredUser = {
      ...existing,
      provider: "google",
      name: profile.name ?? existing.name,
    };

    usersByEmail.set(merged.email, merged);
    return merged;
  }

  const user: StoredUser = {
    id: profile.sub,
    email: profile.email,
    name: profile.name,
    provider: "google",
  };

  usersByEmail.set(user.email, user);
  return user;
}

export function verifyPasswordUser(email: string, password: string): StoredUser | null {
  const user = usersByEmail.get(email);

  if (!user?.passwordHash) {
    return null;
  }

  return user.passwordHash === hashPassword(password) ? user : null;
}

export function createSession(user: AuthUser): AuthSession {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const session = { token, user, expiresAt };

  sessionsByToken.set(token, session);
  return session;
}

export function deleteSession(token: string): void {
  sessionsByToken.delete(token);
}

export function saveGoogleOAuthState(redirectTo: string): GoogleOAuthState {
  const nonce = randomBytes(18).toString("hex");
  const state: GoogleOAuthState = {
    nonce,
    redirectTo: redirectTo.startsWith("/") ? redirectTo : "/",
  };

  oauthStateByNonce.set(nonce, state);
  return state;
}

export function consumeGoogleOAuthState(nonce: string): GoogleOAuthState | null {
  const state = oauthStateByNonce.get(nonce) ?? null;

  if (state) {
    oauthStateByNonce.delete(nonce);
  }

  return state;
}