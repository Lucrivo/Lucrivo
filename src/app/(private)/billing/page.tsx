import {
  CalendarDaysIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireUser } from "@/modules/auth/services/require-user";
import { BillingPlans } from "@/modules/billing/components/billing-plans";
import { CancelSubscriptionButton } from "@/modules/billing/components/cancel-subscription-button";
import { getBillingOverview } from "@/modules/billing/services/get-billing-overview.service";
import { listActivePrices } from "@/modules/billing/services/list-active-prices.service";
import type { BillingOverview } from "@/modules/billing/types";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function formatDate(value: string | null): string {
  if (!value) return "Aguardando confirmação";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? dateFormatter.format(date)
    : "Aguardando confirmação";
}

function currentPlan(overview: BillingOverview) {
  const contract = overview.contract;
  if (!contract) return null;

  const canCancel =
    overview.tier === "paid" &&
    contract.billingMode === "monthly" &&
    contract.paymentMethod === "credit_card" &&
    contract.status === "active" &&
    !contract.cancelAtPeriodEnd &&
    contract.accessEndsAt !== null;

  return (
    <Card
      className="border-primary/20 bg-card overflow-hidden shadow-md"
      role="region"
      aria-label="Seu plano atual"
    >
      <CardHeader className="border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
              Seu plano atual
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Plano {contract.billingMode === "monthly" ? "mensal" : "anual"}
            </h2>
          </div>
          <Badge variant={contract.cancelAtPeriodEnd ? "warning" : "success"}>
            {contract.cancelAtPeriodEnd
              ? "Renovação cancelada"
              : "Acesso ativo"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-1 md:grid-cols-2">
        <div className="bg-muted/45 flex items-start gap-3 rounded-xl p-4">
          <CreditCardIcon
            aria-hidden="true"
            className="text-primary mt-0.5 size-5"
          />
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">
              Pagamento
            </p>
            <p className="mt-1 font-semibold">
              {contract.paymentMethod === "credit_card"
                ? "Cartão de crédito"
                : "Pix"}
            </p>
          </div>
        </div>
        <div className="bg-muted/45 flex items-start gap-3 rounded-xl p-4">
          <CalendarDaysIcon
            aria-hidden="true"
            className="text-primary mt-0.5 size-5"
          />
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">
              Acesso disponível até
            </p>
            <p className="mt-1 font-semibold">
              {formatDate(contract.accessEndsAt)}
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:col-span-2">
          {contract.cancelAtPeriodEnd ? (
            <p className="text-muted-foreground text-sm">
              Não haverá uma nova cobrança. Seu acesso permanece ativo até o fim
              do período pago.
            </p>
          ) : null}
          {canCancel ? (
            <CancelSubscriptionButton accessEndsAt={contract.accessEndsAt!} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function BillingPage() {
  const { supabase, userId } = await requireUser();
  const [overviewResult, pricesResult] = await Promise.all([
    getBillingOverview({ supabase, userId }),
    listActivePrices({ supabase }),
  ]);

  if (overviewResult.status === "read_failed") {
    throw new Error("billing_overview_read_failed");
  }

  const { overview } = overviewResult;
  const prices = pricesResult.status === "success" ? pricesResult.prices : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8">
      <header className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.36fr)] lg:gap-12">
        <div className="grid max-w-3xl gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Plano e cobrança
          </h1>
          <p className="text-muted-foreground text-base leading-7 sm:text-lg">
            Escolha como pagar ou acompanhe até quando seu acesso está
            disponível. Os dados do cartão são informados somente no ambiente
            seguro do Asaas.
          </p>
        </div>
        <div className="border-primary/35 text-foreground flex items-start gap-3 border-l pl-5 text-sm leading-6 font-semibold">
          <ShieldCheckIcon
            aria-hidden="true"
            className="text-primary mt-0.5 size-5 shrink-0"
          />
          O acesso acompanha somente pagamentos confirmados.
        </div>
      </header>

      {overview.tier === "paid" ? (
        currentPlan(overview)
      ) : (
        <section className="grid gap-5" aria-labelledby="available-plans">
          <div className="grid gap-1">
            <h2
              id="available-plans"
              className="text-xl font-semibold tracking-tight"
            >
              Você está no plano gratuito
            </h2>
            <p className="text-muted-foreground">
              Escolha o período e pague no cartão ou no Pix para liberar
              diagnósticos ilimitados.
            </p>
          </div>
          <BillingPlans prices={prices} overview={overview} context="account" />
        </section>
      )}
    </main>
  );
}
