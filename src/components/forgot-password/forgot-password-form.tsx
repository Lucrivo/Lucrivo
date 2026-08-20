"use client";

import { useActionState } from "react";

import {
  AuthEmailField,
  AuthFeedback,
  AuthFooterLink,
  AuthFormShell,
  AuthSubmitButton,
} from "@/components/shared/auth/auth-form";
import type { PasswordRecoveryActionState } from "@/modules/auth/actions/request-password-recovery.action";

const errorMessages = {
  invalid_email: "Informe um e-mail válido para continuar.",
  request_failed:
    "Não foi possível processar sua solicitação agora. Tente novamente em instantes.",
} as const;

type ForgotPasswordFormProps = {
  action: (
    previousState: PasswordRecoveryActionState,
    formData: FormData,
  ) => Promise<PasswordRecoveryActionState>;
};

function ForgotPasswordForm({ action }: ForgotPasswordFormProps) {
  const [state, formAction] = useActionState(action, null);
  const hasError = state?.status === "error";

  return (
    <AuthFormShell
      title="Recupere seu acesso"
      subtitle="Enviaremos um link seguro para você criar uma nova senha."
    >
      <form action={formAction} className="space-y-5" noValidate>
        <AuthEmailField invalid={hasError} />

        {hasError && <AuthFeedback>{errorMessages[state.error]}</AuthFeedback>}
        {state?.status === "success" && (
          <AuthFeedback variant="success">
            Se existir uma conta para este e-mail, enviaremos as instruções de
            recuperação.
          </AuthFeedback>
        )}

        <AuthSubmitButton
          idleLabel="Enviar instruções"
          pendingLabel="Enviando…"
        />
      </form>
      <AuthFooterLink href="/login">Voltar para o login</AuthFooterLink>
    </AuthFormShell>
  );
}

export { ForgotPasswordForm };
