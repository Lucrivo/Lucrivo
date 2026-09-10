import Link from "next/link";
import { CircleCheckIcon, Clock3Icon, CircleXIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/modules/auth/services/require-user";
import { BillingPlans } from "@/modules/billing/components/billing-plans";
import { getBillingOverview } from "@/modules/billing/services/get-billing-overview.service";
import { listActivePrices } from "@/modules/billing/services/list-active-prices.service";

type BillingReturnPageProps = {
  searchParams: Promise<{ outcome?: string | string[] }>;
};

function statusCard(
  tone: "success" | "pending" | "neutral",
  title: string,
  description: string,
) {
  const Icon =
    tone === "success"
      ? CircleCheckIcon
      : tone === "pending"
        ? Clock3Icon
        : CircleXIcon;

  return (
    <Card className="border-primary/15 mx-auto w-full max-w-2xl shadow-md">
      <CardContent className="grid justify-items-center gap-5 px-6 py-10 text-center sm:px-10">
        <span className="bg-primary/10 text-primary ring-primary/15 grid size-14 place-items-center rounded-2xl ring-1">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="text-muted-foreground max-w-xl leading-7">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {tone === "success" ? (
            <Link href="/quick-diagnosis" className={buttonVariants()}>
              Fazer diagnóstico
            </Link>
          ) : null}
          <Link
            href="/billing"
            className={buttonVariants({ variant: "outline" })}
          >
            Atualizar situação
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function BillingReturnPage({
  searchParams,
}: BillingReturnPageProps) {
  const { supabase, userId } = await requireUser();
  const [{ outcome: rawOutcome }, overviewResult, pricesResult] =
    await Promise.all([
      searchParams,
      getBillingOverview({ supabase, userId }),
      listActivePrices({ supabase }),
    ]);

  if (overviewResult.status === "read_failed") {
    throw new Error("billing_overview_read_failed");
  }

  const outcome = typeof rawOutcome === "string" ? rawOutcome : "unknown";
  const { overview } = overviewResult;
  const prices = pricesResult.status === "success" ? pricesResult.prices : [];

  if (outcome === "success") {
    if (overview.tier === "paid") {
      return (
        <main className="flex flex-1 items-center py-8">
          {statusCard(
            "success",
            "Pagamento confirmado",
            "O Asaas confirmou o pagamento e seu acesso já está liberado.",
          )}
        </main>
      );
    }

    if (
      overview.contract?.status === "pending" ||
      overview.contract?.status === "pending_reconciliation"
    ) {
      return (
        <main className="flex flex-1 items-center py-8">
          {statusCard(
            "pending",
            "Confirmando pagamento",
            "Estamos aguardando a confirmação segura do Asaas. Seu acesso será liberado somente após essa confirmação.",
          )}
        </main>
      );
    }

    return (
      <main className="flex flex-1 items-center py-8">
        {statusCard(
          "pending",
          "Pagamento ainda não confirmado",
          "O retorno do checkout não libera acesso sozinho. Consulte novamente em instantes enquanto aguardamos o Asaas.",
        )}
      </main>
    );
  }

  const canceled = outcome === "canceled";
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8">
      <header className="grid max-w-2xl gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {canceled ? "Checkout cancelado" : "Checkout expirado"}
        </h1>
        <p className="text-muted-foreground leading-7">
          Nenhuma mudança de acesso foi feita. Escolha uma opção abaixo quando
          quiser continuar.
        </p>
      </header>
      <BillingPlans prices={prices} overview={overview} context="account" />
    </main>
  );
}
