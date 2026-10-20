"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AbandonPasswordSetup } from "@/components/update-password/abandon-password-setup";
import {
  AuthFeedback,
  AuthFormShell,
} from "@/components/shared/auth/auth-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/infrastructure/database/supabase/clients/browser.client";
import type { PasswordFlow } from "@/modules/auth/actions/update-password.action";

type PasswordSetupMfaChallengeProps = {
  factorId: string;
  flow: PasswordFlow;
  abandonAction: (formData: FormData) => void | Promise<void>;
  notice?: string;
};

const verificationError =
  "Não foi possível confirmar o código. Verifique e tente novamente.";

function PasswordSetupMfaChallenge({
  factorId,
  flow,
  abandonAction,
  notice,
}: PasswordSetupMfaChallengeProps) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) return;

    setPending(true);
    setError(false);

    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify(
        { factorId, code },
      );

      if (verifyError) {
        setError(true);
        return;
      }

      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFormShell
      title="Confirme seu autenticador"
      subtitle="A nova senha só pode ser salva depois deste código."
    >
      <form className="space-y-5" onSubmit={verify} noValidate>
        <div className="space-y-2.5">
          <Label htmlFor="password-setup-mfa-code">
            Código do autenticador
          </Label>
          <Input
            id="password-setup-mfa-code"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            aria-invalid={error || undefined}
            className="h-12 text-center text-lg tracking-[0.3em] tabular-nums"
            autoFocus
          />
        </div>

        {notice && <AuthFeedback>{notice}</AuthFeedback>}
        {error && <AuthFeedback>{verificationError}</AuthFeedback>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || code.length !== 6}
        >
          {pending ? (
            <>
              <Spinner /> Confirmando…
            </>
          ) : (
            "Confirmar código"
          )}
        </Button>
      </form>
      <AbandonPasswordSetup action={abandonAction} flow={flow} />
    </AuthFormShell>
  );
}

export { PasswordSetupMfaChallenge };
