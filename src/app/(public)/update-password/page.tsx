import { AuthPage } from "@/components/shared/auth/auth-page";
import { UpdatePasswordForm } from "@/components/update-password/update-password-form";
import { submitPasswordUpdate } from "@/modules/auth/actions/update-password.action";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const { flow } = await searchParams;
  const safeFlow = flow === "invite" ? "invite" : "recovery";

  return (
    <AuthPage>
      <UpdatePasswordForm action={submitPasswordUpdate} flow={safeFlow} />
    </AuthPage>
  );
}
