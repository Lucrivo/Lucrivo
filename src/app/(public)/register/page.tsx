import { RegisterForm } from "@/components/register/register-form";
import { AuthPage } from "@/components/shared/auth/auth-page";

import { register } from "./actions";

export default function RegisterPage() {
  return (
    <AuthPage>
      <RegisterForm action={register} />
    </AuthPage>
  );
}
