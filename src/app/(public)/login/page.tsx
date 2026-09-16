import { LoginForm } from "@/components/login/login-form";
import { AuthPage } from "@/components/shared/auth/auth-page";
import { isAuthFeatureEnabled } from "@/config/auth-environment";
import { login } from "@/modules/auth/actions/login.action";

const statusMessages = {
  invite_accepted: "Convite aceito. Entre com a senha que você criou.",
  password_updated: "Senha atualizada. Entre novamente para continuar.",
} as const;

type LoginStatus = keyof typeof statusMessages;

function isLoginStatus(value: string | undefined): value is LoginStatus {
  return value === "invite_accepted" || value === "password_updated";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const signupEnabled = isAuthFeatureEnabled(
    process.env.NEXT_PUBLIC_AUTH_SIGNUP_ENABLED,
  );
  const { status } = await searchParams;
  const notice = isLoginStatus(status) ? statusMessages[status] : undefined;

  return (
    <AuthPage>
      <LoginForm action={login} signupEnabled={signupEnabled} notice={notice} />
    </AuthPage>
  );
}
