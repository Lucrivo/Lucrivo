"use client";

import { useActionState } from "react";

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

const errorMessages = {
  invalid_fields: "Preencha todos os campos corretamente.",
  password_mismatch: "As senhas não coincidem. Verifique e tente novamente.",
  captcha_required: "Conclua a verificação de segurança para continuar.",
  weak_password:
    "Use uma senha mais forte, com pelo menos 10 caracteres, uma letra e um número.",
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
  const hasError = state?.status === "error";

  return (
    <AuthFormShell title="Crie sua conta" subtitle="Comece agora com o Lucrivo">
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
