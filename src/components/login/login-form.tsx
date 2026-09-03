"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { LoginActionState } from "@/modules/auth/actions/login.action";
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
import { usePersistedAuthEmail } from "@/components/shared/auth/use-persisted-auth-email";

const errorMessages = {
  invalid_fields: "Preencha o e-mail e a senha corretamente.",
  captcha_required: "Conclua a verificação de segurança para continuar.",
  invalid_credentials:
    "E-mail ou senha inválidos. Verifique os dados e tente novamente.",
  rate_limit:
    "Muitas tentativas de acesso. Aguarde um momento e tente novamente.",
  login_failed: "Não foi possível entrar agora. Tente novamente em instantes.",
} as const;

const turnstileSiteKey = getTurnstileSiteKey(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  process.env.NODE_ENV,
);

type LoginFormProps = {
  action: (
    previousState: LoginActionState,
    formData: FormData,
  ) => Promise<LoginActionState>;
  signupEnabled: boolean;
};

function LoginForm({ action, signupEnabled }: LoginFormProps) {
  const [state, formAction] = useActionState(action, null);
  const [email, setEmail] = usePersistedAuthEmail();
  const [password, setPassword] = useState("");
  const hasError = state?.status === "error";

  return (
    <AuthFormShell title="Bem-vindo de volta" subtitle="Entre na sua conta">
      <form action={formAction} className="space-y-5" noValidate>
        <AuthEmailField
          value={email}
          onValueChange={setEmail}
          invalid={hasError}
        />
        <div className="space-y-2.5">
          <AuthPasswordField
            value={password}
            onValueChange={setPassword}
            invalid={hasError}
          />
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-primary focus-visible:outline-ring rounded-sm text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>
        <TurnstileField siteKey={turnstileSiteKey} resetSignal={state} />
        {hasError && <AuthFeedback>{errorMessages[state.error]}</AuthFeedback>}
        <AuthSubmitButton idleLabel="Entrar" pendingLabel="Entrando…" />
      </form>
      {signupEnabled && (
        <AuthFooterLink href="/register">
          Não possui conta? Cadastre-se
        </AuthFooterLink>
      )}
    </AuthFormShell>
  );
}

export { LoginForm };
