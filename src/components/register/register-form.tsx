"use client";

import { useActionState, useEffect, useState } from "react";

import type { RegisterActionState } from "@/modules/auth/actions/register.action";
import { getTurnstileSiteKey } from "@/config/auth-environment";
import {
  AuthEmailField,
  AuthFeedback,
  AuthFooterLink,
  AuthFormShell,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/shared/auth/auth-form";
import { TurnstileField } from "@/components/shared/auth/turnstile-field";
import { PasswordRequirements } from "@/components/shared/auth/password-requirements";
import { usePersistedAuthEmail } from "@/components/shared/auth/use-persisted-auth-email";

const errorMessages = {
  invalid_fields: "Preencha todos os campos corretamente.",
  password_mismatch: "As senhas não coincidem. Verifique e tente novamente.",
  captcha_required: "Conclua a verificação de segurança para continuar.",
  weak_password:
    "Use uma senha mais forte, com 10 a 72 caracteres, pelo menos uma letra e um número.",
  signup_disabled: "Novos cadastros estão temporariamente indisponíveis.",
  rate_limit:
    "Muitas tentativas de cadastro. Aguarde um momento e tente novamente.",
  signup_failed:
    "Não foi possível criar sua conta agora. Tente novamente em instantes.",
} as const;

const turnstileSiteKey = getTurnstileSiteKey(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  process.env.NODE_ENV,
);

type RegisterFormProps = {
  action: (
    previousState: RegisterActionState,
    formData: FormData,
  ) => Promise<RegisterActionState>;
};

function RegisterForm({ action }: RegisterFormProps) {
  const [state, formAction] = useActionState(action, null);
  const [email, setEmail] = usePersistedAuthEmail();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const hasError = state?.status === "error";

  useEffect(() => {
    if (state?.status !== "success") return;

    const frame = window.requestAnimationFrame(() => {
      setPassword("");
      setConfirmPassword("");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  return (
    <AuthFormShell title="Crie sua conta" subtitle="Comece agora com o Lucrivo">
      <form action={formAction} className="space-y-5" noValidate>
        <AuthEmailField
          value={email}
          onValueChange={setEmail}
          invalid={hasError}
        />
        <AuthPasswordField
          value={password}
          onValueChange={setPassword}
          autoComplete="new-password"
          invalid={hasError}
          describedBy="register-password-requirements"
        />
        <PasswordRequirements
          id="register-password-requirements"
          password={password}
        />
        <AuthPasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirme sua senha"
          placeholder="Digite sua senha novamente"
          autoComplete="new-password"
          invalid={hasError}
          value={confirmPassword}
          onValueChange={setConfirmPassword}
        />

        <TurnstileField siteKey={turnstileSiteKey} resetSignal={state} />

        {hasError && <AuthFeedback>{errorMessages[state.error]}</AuthFeedback>}
        {state?.status === "success" && (
          <AuthFeedback variant="success">
            Se o cadastro puder ser concluído, enviaremos uma confirmação para o
            e-mail informado.
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
