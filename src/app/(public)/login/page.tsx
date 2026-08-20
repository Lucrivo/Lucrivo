import { LoginForm } from "@/components/login/login-form";
import { AuthPage } from "@/components/shared/auth/auth-page";
import { login } from "@/actions/auth/login.action";

export default function LoginPage() {
  return (
    <AuthPage>
      <LoginForm action={login} />
    </AuthPage>
  );
}
