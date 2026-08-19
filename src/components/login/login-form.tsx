"use client";

import {
  AuthEmailField,
  AuthFeedback,
  AuthFooterLink,
  AuthFormShell,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/shared/auth/auth-form";

type LoginFormProps = {
  action: (formData: FormData) => Promise<void>;
  hasInvalidCredentials: boolean;
};

function LoginForm({ action, hasInvalidCredentials }: LoginFormProps) {
  return (
    <AuthFormShell
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta"
      providerLabel="Entrar com Google"
    >
      <form action={action} className="space-y-5">
        <AuthEmailField invalid={hasInvalidCredentials} />
        <AuthPasswordField invalid={hasInvalidCredentials} />
        {hasInvalidCredentials && (
          <AuthFeedback>
            E-mail ou senha inválidos. Verifique os dados e tente novamente.
          </AuthFeedback>
        )}
        <AuthSubmitButton idleLabel="Entrar" pendingLabel="Entrando…" />
      </form>
      <AuthFooterLink href="/register">
        Não possui conta? Cadastre-se
      </AuthFooterLink>
    </AuthFormShell>
  );
}

export { LoginForm };
