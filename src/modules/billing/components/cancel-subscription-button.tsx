"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function formatAccessEnd(accessEndsAt: string): string {
  const date = new Date(accessEndsAt);
  return Number.isFinite(date.getTime())
    ? dateFormatter.format(date)
    : "o fim do período já pago";
}

function CancelSubscriptionButton({ accessEndsAt }: { accessEndsAt: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function confirmCancellation() {
    if (pending) return;

    setPending(true);
    setError(false);

    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const body: unknown = await response.json();
      const status =
        typeof body === "object" && body !== null && "status" in body
          ? body.status
          : null;

      if (
        !response.ok ||
        (status !== "canceled" && status !== "already_canceled")
      ) {
        throw new Error("cancellation_failed");
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button type="button" variant="outline" />}>
          Cancelar renovação
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar renovação mensal?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu acesso continua disponível até {formatAccessEnd(accessEndsAt)}
              . Depois dessa data, o cartão não será cobrado novamente e os
              relatórios extras ficarão bloqueados, sem serem apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={confirmCancellation}
            >
              {pending ? "Cancelando..." : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível cancelar agora. Tente novamente.
        </p>
      ) : null}
    </div>
  );
}

export { CancelSubscriptionButton };
