"use client";

import { useActionState, useEffect, useState } from "react";

import type { RegisterActionState } from "@/modules/auth/actions/register.action";
import { getTurnstileSiteKey } from "@/config/auth-environment";
import { completeLoginNavigation } from "@/components/login/complete-login-navigation";
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
  legal_acceptance_required:
    "Aceite os Termos de Uso e a Política de Privacidade para criar a conta.",
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

    if (state.outcome === "authenticated") {
      completeLoginNavigation(state.destination);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setPassword("");
      setConfirmPassword("");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  return (
    <AuthFormShell
      title={
        <>
          <span className="block text-center">Crie sua conta grátis</span>{" "}
          <span className="block text-center text-[#a9c7ff]">e descubra.</span>
        </>
      }
    >
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

        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            name="acceptedLegalTerms"
            value="on"
            className="mt-1 size-4"
          />
          <span>
            Li e aceito os <a href="/terms">Termos de Uso</a> e a{" "}
            <a href="/privacy">Política de Privacidade</a>.
          </span>
        </label>

        {hasError &&
          (state.error === "account_exists" ? (
            <AuthFeedback>
              Se você já tem uma conta com este e-mail, entre ou{" "}
              <a
                href="/forgot-password"
                className="underline underline-offset-4"
              >
                recupere a senha
              </a>
              .
            </AuthFeedback>
          ) : (
            <AuthFeedback>{errorMessages[state.error]}</AuthFeedback>
          ))}
        {state?.status === "success" &&
          state.outcome === "confirmation_required" && (
            <AuthFeedback variant="success">
              Se o cadastro puder ser concluído, enviaremos uma confirmação para
              o e-mail informado.
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
