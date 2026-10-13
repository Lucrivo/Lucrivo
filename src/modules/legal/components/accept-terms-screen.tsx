"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { AcceptLegalTermsState } from "@/modules/legal/accept-legal-terms.action";

function AcceptTermsScreen({
  action,
  logoutAction,
  state,
}: {
  action: (formData: FormData) => void | Promise<void>;
  logoutAction: (formData: FormData) => void | Promise<void>;
  state: AcceptLegalTermsState;
}) {
  return (
    <section className="bg-card w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Aceite os termos
      </h1>
      <p className="text-muted-foreground mt-3 text-sm leading-6">
        Li e aceito os <a href="/terms">Termos de Uso</a> e a{" "}
        <a href="/privacy">Política de Privacidade</a>.
      </p>
      <form action={action} className="mt-6 grid gap-3">
        <Button type="submit">Aceitar</Button>
        {state?.status === "error" ? (
          <p role="alert" className="text-destructive text-sm">
            Não foi possível registrar o aceite. Tente novamente.
          </p>
        ) : null}
      </form>
      <form action={logoutAction} className="mt-3">
        <Button type="submit" variant="outline" className="w-full">
          Sair da conta
        </Button>
      </form>
    </section>
  );
}

function AcceptTermsForm({
  action,
  logoutAction,
}: {
  action: (
    previousState: AcceptLegalTermsState,
    formData: FormData,
  ) => Promise<AcceptLegalTermsState>;
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <AcceptTermsScreen
      action={formAction}
      logoutAction={logoutAction}
      state={state}
    />
  );
}

function AcceptTermsUnavailable({
  logoutAction,
}: {
  logoutAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <section className="bg-card w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Não foi possível verificar agora.
      </h1>
      <div className="mt-6 grid gap-3">
        <Button variant="outline" render={<a href="/accept-terms" />}>
          Tentar de novo
        </Button>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full">
            Sair da conta
          </Button>
        </form>
      </div>
    </section>
  );
}

export { AcceptTermsForm, AcceptTermsScreen, AcceptTermsUnavailable };
