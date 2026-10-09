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

const refundErrors: Record<number, string> = {
  409: "Este pagamento não está disponível para reembolso agora. Atualize a página e confira a situação do plano.",
  422: "O Asaas não aceitou o reembolso. Você pode tentar novamente enquanto o prazo estiver aberto.",
  503: "A solicitação precisa ser conferida antes de uma nova tentativa. Aguarde a atualização ou fale com o suporte.",
};

function RefundButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmRefund() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/refund", { method: "POST" });
      const body: unknown = await response.json();
      const status =
        typeof body === "object" && body !== null && "status" in body
          ? body.status
          : null;
      if (
        !response.ok ||
        (status !== "submitted" &&
          status !== "already_submitted" &&
          status !== "confirmed")
      ) {
        throw new Error(String(response.status));
      }

      setOpen(false);
      router.refresh();
    } catch (cause) {
      const code = cause instanceof Error ? Number(cause.message) : NaN;
      setOpen(false);
      setError(
        refundErrors[code] ??
          "Não foi possível pedir o reembolso agora. Tente novamente.",
      );
      setPending(false);
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!pending) setOpen(nextOpen);
        }}
      >
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
            />
          }
        >
          Pedir reembolso
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reembolso integral?</AlertDialogTitle>
            <AlertDialogDescription>
              O valor integral será solicitado ao Asaas e seu acesso termina
              imediatamente. Em pagamentos no cartão, o crédito pode levar até
              10 dias úteis para aparecer na fatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={confirmRefund}
            >
              {pending ? "Solicitando..." : "Confirmar reembolso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? (
        <p className="text-destructive max-w-xl text-sm leading-6" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { RefundButton };
