"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/infrastructure/database/supabase/clients/browser.client";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type SetupError = "start_failed" | "verify_failed" | "copy_failed";

const friendlyName = "Lucrivo Admin";

const errorMessages: Record<SetupError, string> = {
  start_failed:
    "Não foi possível iniciar a configuração. Aguarde um momento e tente novamente.",
  verify_failed:
    "Não foi possível confirmar o código. Verifique e tente novamente.",
  copy_failed: "Não foi possível copiar a chave. Selecione e copie manualmente.",
};

function AdminMfaSetup() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<SetupError | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function startEnrollment() {
    setPending(true);
    setError(null);
    setCopyStatus(null);

    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error || !Array.isArray(factors.data?.all)) {
        throw new Error("factor-list-unavailable");
      }

      const abandoned = factors.data.all.filter(
        (factor) =>
          factor.factor_type === "totp" &&
          factor.status === "unverified" &&
          factor.friendly_name === friendlyName,
      );

      for (const factor of abandoned) {
        const result = await supabase.auth.mfa.unenroll({
          factorId: factor.id,
        });
        if (result.error) throw new Error("factor-cleanup-failed");
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName,
      });

      if (
        enrollError ||
        !data?.id ||
        !data.totp?.qr_code ||
        !data.totp.secret
      ) {
        throw new Error("factor-enrollment-failed");
      }

      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch {
      setError("start_failed");
    } finally {
      setPending(false);
    }
  }

  async function copySecret() {
    if (!enrollment) return;
    setError(null);

    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopyStatus("Chave copiada.");
    } catch {
      setCopyStatus(null);
      setError("copy_failed");
    }
  }

  async function verifyEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment || code.length !== 6) return;

    setPending(true);
    setError(null);

    try {
      const { error: verifyError } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: enrollment.factorId,
          code,
        });

      if (verifyError) {
        setError("verify_failed");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("verify_failed");
    } finally {
      setPending(false);
    }
  }

  if (!enrollment) {
    return (
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm leading-6">
          Use um aplicativo autenticador para proteger o acesso administrativo.
          A configuração começa somente quando você solicitar.
        </p>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {errorMessages[error]}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={startEnrollment}
        >
          {pending ? (
            <>
              <Spinner /> Preparando…
            </>
          ) : (
            "Configurar aplicativo"
          )}
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={verifyEnrollment} noValidate>
      <div className="bg-muted/40 grid place-items-center rounded-xl p-4">
        <Image
          src={enrollment.qrCode}
          alt="QR Code para configurar o autenticador"
          width={220}
          height={220}
          unoptimized
          className="size-[220px] max-w-full rounded-lg"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Chave para configuração manual</p>
        <div className="bg-muted flex items-center gap-2 rounded-xl p-3">
          <code className="min-w-0 flex-1 break-all text-sm">
            {enrollment.secret}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copySecret}
            aria-label="Copiar chave"
          >
            <CopyIcon aria-hidden="true" />
            Copiar
          </Button>
        </div>
        {copyStatus && (
          <p role="status" className="text-success flex items-center gap-1 text-sm">
            <CheckIcon aria-hidden="true" /> {copyStatus}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="admin-mfa-code">Código de verificação</Label>
        <Input
          id="admin-mfa-code"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="[0-9]{6}"
          aria-invalid={error === "verify_failed" || undefined}
          className="h-12 text-center text-lg tracking-[0.3em] tabular-nums"
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {errorMessages[error]}
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
          "Ativar MFA"
        )}
      </Button>
    </form>
  );
}

export { AdminMfaSetup };
