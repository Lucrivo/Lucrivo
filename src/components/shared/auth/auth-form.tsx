"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  CheckCircle2Icon,
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

type AuthFormShellProps = {
  title: string;
  subtitle: string;
  providerLabel: string;
  children: React.ReactNode;
};

function AuthFormShell({
  title,
  subtitle,
  providerLabel,
  children,
}: AuthFormShellProps) {
  return (
    <div className="animate-fade-up mx-auto w-full max-w-md [animation-delay:120ms]">
      <div className="mb-9">
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg">
          {subtitle}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        title={providerLabel}
      >
        <GlobeIcon className="text-primary" />
        {providerLabel}
      </Button>
      <div className="my-8 flex items-center gap-4" aria-hidden="true">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-sm">ou</span>
        <div className="bg-border h-px flex-1" />
      </div>
      {children}
    </div>
  );
}

function AuthEmailField({ invalid = false }: { invalid?: boolean }) {
  return (
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
          aria-invalid={invalid || undefined}
        />
      </div>
    </div>
  );
}

type AuthPasswordFieldProps = {
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  invalid?: boolean;
};

function AuthPasswordField({
  id = "password",
  name = "password",
  label = "Senha",
  placeholder = "Digite sua senha",
  autoComplete = "current-password",
  invalid = false,
}: AuthPasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyholeIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          minLength={10}
          className="h-12 pr-12 pl-11"
          aria-invalid={invalid || undefined}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 shadow-none hover:-translate-y-1/2 active:-translate-y-1/2 active:scale-100"
          onClick={() => setShowPassword((visible) => !visible)}
          aria-label={`${showPassword ? "Ocultar" : "Mostrar"} ${label.toLocaleLowerCase("pt-BR")}`}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>
    </div>
  );
}

function AuthFeedback({
  variant = "error",
  children,
}: {
  variant?: "error" | "success";
  children: React.ReactNode;
}) {
  const Icon = variant === "success" ? CheckCircle2Icon : TriangleAlertIcon;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={
        variant === "success"
          ? "border-success/25 bg-success/10 text-success animate-fade-in flex items-start gap-2 rounded-lg border p-3 text-sm"
          : "border-destructive/25 bg-destructive/10 text-destructive animate-fade-in flex items-start gap-2 rounded-lg border p-3 text-sm"
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function AuthSubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
      {pending ? (
        <>
          <Spinner /> {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  );
}

function AuthFooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-7 text-center">
      <Link
        href={href}
        className="text-primary focus-visible:outline-ring rounded-sm text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {children}
      </Link>
    </div>
  );
}

export {
  AuthEmailField,
  AuthFeedback,
  AuthFooterLink,
  AuthFormShell,
  AuthPasswordField,
  AuthSubmitButton,
};
