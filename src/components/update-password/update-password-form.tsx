"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  AuthFeedback,
  AuthFormShell,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/shared/auth/auth-form";
import { PasswordRequirements } from "@/components/shared/auth/password-requirements";
import { AbandonPasswordSetup } from "@/components/update-password/abandon-password-setup";
import type {
  PasswordFlow,
  UpdatePasswordActionState,
} from "@/modules/auth/actions/update-password.action";

const errorMessages = {
  invalid_fields:
    "Use uma senha de 10 a 72 caracteres, com pelo menos uma letra e um número.",
  password_mismatch: "As senhas não coincidem. Verifique e tente novamente.",
  weak_password:
    "Use uma senha mais forte, com 10 a 72 caracteres, pelo menos uma letra e um número.",
  mfa_required:
    "Confirme o código do autenticador antes de salvar a nova senha.",
  update_failed: "Não foi possível atualizar sua senha agora. Tente novamente.",
} as const;

const flowCopy = {
  recovery: {
    title: "Crie uma nova senha",
    subtitle: "Escolha uma senha segura para recuperar seu acesso.",
    submit: "Salvar nova senha",
    pending: "Salvando…",
  },
  invite: {
    title: "Crie sua senha",
    subtitle: "Defina uma senha segura para concluir seu convite.",
    submit: "Criar senha",
    pending: "Criando…",
  },
} as const;

type UpdatePasswordFormProps = {
  action: (
    previousState: UpdatePasswordActionState,
    formData: FormData,
  ) => Promise<UpdatePasswordActionState>;
  abandonAction: (formData: FormData) => void | Promise<void>;
  flow?: PasswordFlow;
  notice?: string;
};

function UpdatePasswordForm({
  action,
  abandonAction,
  flow = "recovery",
  notice,
}: UpdatePasswordFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const hasError = state?.status === "error";
  const copy = flowCopy[flow];

  useEffect(() => {
    if (state?.status === "error" && state.error === "mfa_required") {
      router.refresh();
    }
  }, [router, state]);

  return (
    <AuthFormShell title={copy.title} subtitle={copy.subtitle}>
      <form action={formAction} className="space-y-5" noValidate>
        <input type="hidden" name="flow" value={flow} />
        <AuthPasswordField
          label="Nova senha"
          placeholder="Digite sua nova senha"
          autoComplete="new-password"
          invalid={hasError}
          describedBy="password-requirements"
          value={password}
          onValueChange={setPassword}
        />
        <PasswordRequirements id="password-requirements" password={password} />
        <AuthPasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmação da senha"
          placeholder="Digite a nova senha novamente"
          autoComplete="new-password"
          invalid={hasError}
          describedBy="password-requirements"
          value={confirmPassword}
          onValueChange={setConfirmPassword}
        />

        {notice && <AuthFeedback>{notice}</AuthFeedback>}
        {hasError && <AuthFeedback>{errorMessages[state.error]}</AuthFeedback>}

        <AuthSubmitButton idleLabel={copy.submit} pendingLabel={copy.pending} />
      </form>
      <AbandonPasswordSetup action={abandonAction} flow={flow} />
    </AuthFormShell>
  );
}

export { UpdatePasswordForm };
