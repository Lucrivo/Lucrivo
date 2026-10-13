import Link from "next/link";
import { FileChartColumnIcon, FilterXIcon, PlusIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { ClearDashboardFiltersButton } from "./dashboard-filter-persistence";

const content = {
  no_history: {
    title: "Crie seu primeiro diagnóstico",
    body: "Conclua um diagnóstico para ver aqui os resultados, prioridades e valores calculados pelo Lucrivo.",
    action: { label: "Criar primeiro diagnóstico", href: "/quick-diagnosis" },
  },
  no_results: {
    title: "Nenhum relatório encontrado com esses filtros",
    body: "Ajuste os filtros ou limpe a seleção para ver seus relatórios novamente.",
    action: { label: "Limpar filtros", href: "/dashboard" },
    secondaryAction: { label: "Novo diagnóstico", href: "/quick-diagnosis" },
  },
} as const;

function ClientDashboardEmptyState({ kind }: { kind: keyof typeof content }) {
  const state = content[kind];
  const Icon = kind === "no_history" ? FileChartColumnIcon : FilterXIcon;

  return (
    <Card className="border-dashed py-10 text-center">
      <CardContent className="mx-auto grid max-w-xl justify-items-center gap-5">
        <span className="bg-primary/10 text-primary grid size-12 place-items-center rounded-2xl">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="grid gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {state.title}
          </h2>
          <p className="text-muted-foreground leading-6">{state.body}</p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          {kind === "no_results" ? (
            <ClearDashboardFiltersButton size="lg" variant="default" />
          ) : (
            <Link
              href={state.action.href}
              className={buttonVariants({ size: "lg" })}
            >
              <PlusIcon aria-hidden="true" />
              {state.action.label}
            </Link>
          )}
          {"secondaryAction" in state ? (
            <Link
              href={state.secondaryAction.href}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <PlusIcon aria-hidden="true" />
              {state.secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export { ClientDashboardEmptyState };
