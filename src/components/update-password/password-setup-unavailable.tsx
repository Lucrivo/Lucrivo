import { AbandonPasswordSetup } from "@/components/update-password/abandon-password-setup";
import {
  AuthFeedback,
  AuthFormShell,
} from "@/components/shared/auth/auth-form";
import type { PasswordFlow } from "@/modules/auth/actions/update-password.action";

type PasswordSetupUnavailableProps = {
  flow: PasswordFlow;
  abandonAction: (formData: FormData) => void | Promise<void>;
  notice?: string;
};

function PasswordSetupUnavailable({
  flow,
  abandonAction,
  notice,
}: PasswordSetupUnavailableProps) {
  return (
    <AuthFormShell
      title="Não foi possível continuar"
      subtitle="Saia desta tentativa e solicite um novo link."
    >
      <AuthFeedback>
        {notice ?? "Não foi possível verificar o autenticador agora."}
      </AuthFeedback>
      <AbandonPasswordSetup action={abandonAction} flow={flow} />
    </AuthFormShell>
  );
}

export { PasswordSetupUnavailable };
