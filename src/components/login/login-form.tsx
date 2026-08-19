"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  EyeIcon,
  EyeOffIcon,
  GlobeIcon,
  LockKeyholeIcon,
  MailIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type LoginFormProps = {
  action: (formData: FormData) => Promise<void>;
  hasInvalidCredentials: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
      {pending ? (
        <>
          <Spinner /> Entrando…
        </>
      ) : (
        "Entrar"
      )}
    </Button>
  );
}

function LoginForm({ action, hasInvalidCredentials }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="animate-fade-up mx-auto w-full max-w-md [animation-delay:120ms]">
      <div className="mb-9">
        <h1 className="text-3xl sm:text-4xl">Bem-vindo de volta</h1>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg">
          Entre na sua conta
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        title="Login com Google"
      >
        <GlobeIcon className="text-primary" />
        Entrar com Google
      </Button>
      <div className="my-8 flex items-center gap-4" aria-hidden="true">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-sm">ou</span>
        <div className="bg-border h-px flex-1" />
      </div>

      <form action={action} className="space-y-5">
        <div className="space-y-2.5">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <MailIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Digite seu e-mail"
              required
              className="h-12 pr-4 pl-11"
              aria-invalid={hasInvalidCredentials || undefined}
            />
          </div>
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <LockKeyholeIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              required
              className="h-12 pr-12 pl-11"
              aria-invalid={hasInvalidCredentials || undefined}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 shadow-none hover:translate-y-[-50%]"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </div>
        </div>
        {hasInvalidCredentials && (
          <div
            role="alert"
            className="border-destructive/25 bg-destructive/10 text-destructive animate-fade-in flex items-start gap-2 rounded-lg border p-3 text-sm"
          >
            <TriangleAlertIcon
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              E-mail ou senha inválidos. Verifique os dados e tente novamente.
            </span>
          </div>
        )}
        <SubmitButton />
      </form>
      <div className="mt-7 text-center">
        <Link
          href="/login#forgot-password"
          className="text-primary focus-visible:outline-ring rounded-sm text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Esqueceu sua senha?
        </Link>
      </div>
    </div>
  );
}

export { LoginForm };
