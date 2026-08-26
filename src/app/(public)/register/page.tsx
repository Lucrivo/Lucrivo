import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/register/register-form";
import { AuthPage } from "@/components/shared/auth/auth-page";
import { isAuthFeatureEnabled } from "@/config/auth-environment";
import { register } from "@/modules/auth/actions/register.action";

export default function RegisterPage() {
  const signupEnabled = isAuthFeatureEnabled(
    process.env.NEXT_PUBLIC_AUTH_SIGNUP_ENABLED,
  );

  if (!signupEnabled) redirect("/login?status=signup_disabled");

  return (
    <AuthPage>
      <RegisterForm action={register} />
    </AuthPage>
  );
}
