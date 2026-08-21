import { AuthPage } from "@/components/shared/auth/auth-page";
import { UpdatePasswordForm } from "@/components/update-password/update-password-form";
import { submitPasswordUpdate } from "@/modules/auth/actions/update-password.action";

export default function UpdatePasswordPage() {
  return (
    <AuthPage>
      <UpdatePasswordForm action={submitPasswordUpdate} />
    </AuthPage>
  );
}
