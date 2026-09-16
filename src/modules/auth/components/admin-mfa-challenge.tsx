"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/infrastructure/database/supabase/clients/browser.client";

type AdminMfaChallengeProps = {
  factorId: string;
};

const verificationError =
  "Não foi possível confirmar o código. Verifique e tente novamente.";

function AdminMfaChallenge({ factorId }: AdminMfaChallengeProps) {
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
      const { error: verifyError } =
        await supabase.auth.mfa.challengeAndVerify({ factorId, code });

      if (verifyError) {
        setError(true);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={verify} noValidate>
      <div className="space-y-2.5">
        <Label htmlFor="admin-mfa-challenge-code">
          Código do autenticador
        </Label>
        <Input
          id="admin-mfa-challenge-code"
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

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {verificationError}
        </p>
      )}

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
          "Confirmar acesso"
        )}
      </Button>
    </form>
  );
}

export { AdminMfaChallenge };
