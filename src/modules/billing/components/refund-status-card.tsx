import {
  CircleCheckIcon,
  Clock3Icon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type { BillingRefundStatus } from "../types";

const content: Record<
  BillingRefundStatus,
  { title: string; description: string; Icon: typeof Clock3Icon }
> = {
  processing: {
    title: "Solicitando seu reembolso",
    description:
      "Seu acesso já foi interrompido enquanto enviamos a solicitação ao Asaas.",
    Icon: Clock3Icon,
  },
  submitted: {
    title: "Reembolso enviado ao Asaas",
    description:
      "A confirmação financeira ainda pode chegar por webhook. No cartão, o crédito pode levar até 10 dias úteis para aparecer na fatura.",
    Icon: Clock3Icon,
  },
  pending_reconciliation: {
    title: "Reembolso em conferência",
    description:
      "Não faremos outra tentativa automática. Aguarde a atualização ou fale com o suporte para conferirmos o pagamento com segurança.",
    Icon: TriangleAlertIcon,
  },
  rejected: {
    title: "Reembolso não concluído",
    description:
      "Seu acesso foi restaurado. Se o prazo de 7 dias ainda estiver aberto, você pode tentar novamente.",
    Icon: RotateCcwIcon,
  },
  confirmed: {
    title: "Reembolso confirmado",
    description:
      "O Asaas confirmou o estorno. O prazo para o crédito aparecer depende do banco ou da operadora do cartão.",
    Icon: CircleCheckIcon,
  },
};

function RefundStatusCard({ status }: { status: BillingRefundStatus }) {
  const state = content[status];
  const Icon = state.Icon;

  return (
    <Card
      role="region"
      aria-label="Situação do reembolso"
      className="border-primary/20 bg-card shadow-sm"
    >
      <CardHeader className="flex flex-row items-start gap-4">
        <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {state.title}
          </h2>
          <p className="text-muted-foreground text-sm leading-6">
            {state.description}
          </p>
        </div>
      </CardHeader>
      {status === "pending_reconciliation" ? (
        <CardContent>
          <p className="text-sm font-medium">
            Evite repetir a solicitação enquanto a conferência estiver em
            andamento.
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export { RefundStatusCard };
