import { LoginForm } from "../../../features/auth/components/LoginForm";

type AuthPageProps = {
  params: {
    locale: string;
  };
};

export default function AuthPage({ params }: AuthPageProps) {
  return <LoginForm locale={params.locale} />;
}
