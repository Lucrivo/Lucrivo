"use client";

import { useActionState } from "react";

import type { LoginActionState } from "@/modules/auth/actions/login.action";
import {
  AuthEmailField,
  AuthFeedback,
  AuthFooterLink,
  AuthFormShell,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/shared/auth/auth-form";

const errorMessages = {
  invalid_fields: "Preencha o e-mail e a senha corretamente.",
  invalid_credentials:
    "E-mail ou senha inválidos. Verifique os dados e tente novamente.",
  rate_limit:
    "Muitas tentativas de acesso. Aguarde um momento e tente novamente.",
  login_failed: "Não foi possível entrar agora. Tente novamente em instantes.",
} as const;

type LoginFormProps = {
  action: (
    previousState: LoginActionState,
    formData: FormData,
  ) => Promise<LoginActionState>;
};

function LoginForm({ action }: LoginFormProps) {
  const [state, formAction] = useActionState(action, null);
  const hasError = state?.status === "error";

  return (
    <AuthFormShell
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta"
      providerLabel="Entrar com Google"
    >
      <form action={formAction} className="space-y-5" noValidate>
        <AuthEmailField invalid={hasError} />
        <AuthPasswordField invalid={hasError} />
        {hasError && <AuthFeedback>{errorMessages[state.error]}</AuthFeedback>}
        <AuthSubmitButton idleLabel="Entrar" pendingLabel="Entrando…" />
      </form>
      <AuthFooterLink href="/register">
        Não possui conta? Cadastre-se
      </AuthFooterLink>
    </AuthFormShell>
  );
}

export { LoginForm };
