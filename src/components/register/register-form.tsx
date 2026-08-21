"use client";

import { useActionState } from "react";

import type { RegisterActionState } from "@/modules/auth/actions/register.action";
import {
  AuthEmailField,
  AuthFeedback,
  AuthFooterLink,
  AuthFormShell,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/shared/auth/auth-form";

const errorMessages = {
  invalid_fields: "Preencha todos os campos corretamente.",
  password_mismatch: "As senhas não coincidem. Verifique e tente novamente.",
  weak_password:
    "Use uma senha mais forte, com pelo menos 10 caracteres, uma letra e um número.",
  signup_disabled: "Novos cadastros estão temporariamente indisponíveis.",
  rate_limit:
    "Muitas tentativas de cadastro. Aguarde um momento e tente novamente.",
  signup_failed:
    "Não foi possível criar sua conta agora. Tente novamente em instantes.",
} as const;

type RegisterFormProps = {
  action: (
    previousState: RegisterActionState,
    formData: FormData,
  ) => Promise<RegisterActionState>;
};

function RegisterForm({ action }: RegisterFormProps) {
  const [state, formAction] = useActionState(action, null);
  const hasError = state?.status === "error";

  return (
    <AuthFormShell
      title="Crie sua conta"
      subtitle="Comece agora com o Lucrivo"
      providerLabel="Cadastrar com Google"
    >
      <form action={formAction} className="space-y-5" noValidate>
        <AuthEmailField invalid={hasError} />
        <AuthPasswordField autoComplete="new-password" invalid={hasError} />
        <AuthPasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirme sua senha"
          placeholder="Digite sua senha novamente"
          autoComplete="new-password"
          invalid={hasError}
        />

        {hasError && <AuthFeedback>{errorMessages[state.error]}</AuthFeedback>}
        {state?.status === "success" && (
          <AuthFeedback variant="success">
            Cadastro realizado. Verifique seu e-mail para confirmar sua conta.
          </AuthFeedback>
        )}

        <AuthSubmitButton
          idleLabel="Criar conta"
          pendingLabel="Criando conta…"
        />
      </form>
      <AuthFooterLink href="/login">Já tem uma conta? Entrar</AuthFooterLink>
    </AuthFormShell>
  );
}

export { RegisterForm };
