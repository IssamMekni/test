type LoginFormProps = {
  locale: string;
};

export function LoginForm({ locale }: LoginFormProps) {
  const loginAction = `/${locale}/api/auth/login`;
  const registerAction = `/${locale}/api/auth/register`;
  const googleAction = `/${locale}/api/auth/google`;

  return (
    <main>
      <h1>Sign in</h1>
      <form method="post" action={loginAction}>
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" minLength={8} required />
        </label>
        <button type="submit">Sign in</button>
        <button type="submit" formAction={registerAction}>
          Create account
        </button>
      </form>
      <a href={googleAction}>Continue with Google</a>
    </main>
  );
}
