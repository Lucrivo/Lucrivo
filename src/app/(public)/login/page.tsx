import { LoginForm } from "@/components/login/login-form";
import { AuthPage } from "@/components/shared/auth/auth-page";
import { login } from "@/modules/auth/actions/login.action";

export default function LoginPage() {
  return (
    <AuthPage>
      <LoginForm action={login} />
    </AuthPage>
  );
}
