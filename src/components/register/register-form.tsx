"use client";

import { useActionState } from "react";

import {
  AuthEmailField,
  AuthFeedback,
  AuthFooterLink,
  AuthFormShell,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/shared/auth/auth-form";

type RegisterResult = { error?: string; success?: boolean };

type RegisterFormProps = {
  action: (formData: FormData) => Promise<RegisterResult>;
};

function RegisterForm({ action }: RegisterFormProps) {
  const [state, formAction] = useActionState<RegisterResult | null, FormData>(
    async (_previousState, formData) => {
      if (formData.get("password") !== formData.get("confirmPassword")) {
        return { error: "password_mismatch" };
      }
      return action(formData);
    },
    null,
  );

  const hasError = Boolean(state?.error);
  const errorMessage =
    state?.error === "password_mismatch"
      ? "As senhas não coincidem. Verifique e tente novamente."
      : state?.error;

  return (
    <AuthFormShell
      title="Crie sua conta"
      subtitle="Comece agora com o Lucrivo"
      providerLabel="Cadastrar com Google"
    >
      <form action={formAction} className="space-y-5">
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

        {errorMessage && <AuthFeedback>{errorMessage}</AuthFeedback>}
        {state?.success && (
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

export { RegisterForm, type RegisterResult };
