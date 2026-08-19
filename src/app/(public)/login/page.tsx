import { LoginForm } from "@/components/login/login-form";
import { AuthPage } from "@/components/shared/auth/auth-page";

import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <AuthPage>
      <LoginForm
        action={login}
        hasInvalidCredentials={error === "invalid_credentials"}
      />
    </AuthPage>
  );
}
