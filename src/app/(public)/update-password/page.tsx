import { AuthPage } from "@/components/shared/auth/auth-page";
import { PasswordSetupMfaChallenge } from "@/components/update-password/password-setup-mfa-challenge";
import { PasswordSetupUnavailable } from "@/components/update-password/password-setup-unavailable";
import { UpdatePasswordForm } from "@/components/update-password/update-password-form";
import {
  abandonPasswordSetup,
  submitPasswordUpdate,
} from "@/modules/auth/actions/update-password.action";
import { resolvePasswordUpdateGate } from "@/modules/auth/services/resolve-password-update-gate";

const signOutFailedNotice =
  "Não foi possível encerrar esta tentativa. Tente novamente.";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string; error?: string }>;
}) {
  const { flow, error } = await searchParams;
  const safeFlow = flow === "invite" ? "invite" : "recovery";
  const notice = error === "sign_out_failed" ? signOutFailedNotice : undefined;
  const gate = await resolvePasswordUpdateGate();

  return (
    <AuthPage>
      {gate.status === "mfa" ? (
        <PasswordSetupMfaChallenge
          factorId={gate.factorId}
          flow={safeFlow}
          abandonAction={abandonPasswordSetup}
          notice={notice}
        />
      ) : gate.status === "unavailable" ? (
        <PasswordSetupUnavailable
          flow={safeFlow}
          abandonAction={abandonPasswordSetup}
          notice={notice}
        />
      ) : (
        <UpdatePasswordForm
          action={submitPasswordUpdate}
          abandonAction={abandonPasswordSetup}
          flow={safeFlow}
          notice={notice}
        />
      )}
    </AuthPage>
  );
}
