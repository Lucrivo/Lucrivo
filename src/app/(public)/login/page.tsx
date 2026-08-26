import { LoginForm } from "@/components/login/login-form";
import { AuthPage } from "@/components/shared/auth/auth-page";
import { isAuthFeatureEnabled } from "@/config/auth-environment";
import { login } from "@/modules/auth/actions/login.action";

export default function LoginPage() {
  const signupEnabled = isAuthFeatureEnabled(
    process.env.NEXT_PUBLIC_AUTH_SIGNUP_ENABLED,
  );

  return (
    <AuthPage>
      <LoginForm action={login} signupEnabled={signupEnabled} />
    </AuthPage>
  );
}
