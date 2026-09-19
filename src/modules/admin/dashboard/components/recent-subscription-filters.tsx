import Link from "next/link";
import { FilterIcon, RotateCcwIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AdminSubscriptionFilters } from "../admin-dashboard-filters";

function RecentSubscriptionFilters({
  filters,
}: {
  filters: AdminSubscriptionFilters;
}) {
  return (
    <form
      action="/admin"
      method="get"
      className="bg-muted/25 grid gap-3 rounded-xl border p-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(9rem,1fr))_auto_auto] xl:items-end"
    >
      <label className="grid gap-1.5 text-sm font-medium">
        Período das assinaturas
        <select
          name="period"
          defaultValue={filters.period}
          className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/20 h-10 rounded-lg border px-3 outline-none focus-visible:ring-3"
        >
          <option value="all">Todo o período</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Modalidade
        <select
          name="billing"
          defaultValue={filters.billingMode}
          className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/20 h-10 rounded-lg border px-3 outline-none focus-visible:ring-3"
        >
          <option value="all">Todas</option>
          <option value="monthly">Mensal</option>
          <option value="annual">Anual</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2 xl:col-span-1">
        Situação
        <select
          name="subscriptionState"
          defaultValue={filters.state}
          className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/20 h-10 rounded-lg border px-3 outline-none focus-visible:ring-3"
        >
          <option value="all">Todas</option>
          <option value="active">Com acesso ativo</option>
          <option value="ended">Encerradas</option>
        </select>
      </label>
      <Button type="submit">
        <FilterIcon aria-hidden="true" />
        Aplicar
      </Button>
      <Link
        href="/admin"
        className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
      >
        <RotateCcwIcon aria-hidden="true" />
        Limpar
      </Link>
      <p className="text-muted-foreground text-sm sm:col-span-2 xl:col-span-5">
        Os filtros abaixo afetam somente esta lista.
      </p>
    </form>
  );
}

export { RecentSubscriptionFilters };
