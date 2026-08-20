import { ForgotPasswordForm } from "@/components/forgot-password/forgot-password-form";
import { AuthPage } from "@/components/shared/auth/auth-page";
import { requestPasswordRecovery } from "@/modules/auth/actions/request-password-recovery.action";

export default function ForgotPasswordPage() {
  return (
    <AuthPage>
      <ForgotPasswordForm action={requestPasswordRecovery} />
    </AuthPage>
  );
}
