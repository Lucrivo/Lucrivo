"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { FilterIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  buildClientDashboardHref,
  nextCalendarDate,
  previousCalendarDate,
  type ClientDashboardFilters,
  type DashboardCategory,
  type DashboardDataState,
  type DashboardMode,
} from "@/modules/client-dashboard/client-dashboard.filters";
import type {
  ReportPriority,
  ReportScenario,
  ReportVerdict,
} from "@/modules/reports/types";

type Situation =
  "all" | "positive" | "break_even" | "loss" | "no_sales" | "pending";

type FilterDraft = {
  from: string;
  until: string;
  category: DashboardCategory | "all";
  mode: DashboardMode | "all";
  situation: Situation;
  dataState: DashboardDataState;
  scenario: ReportScenario | "all";
  priority: ReportPriority | "all";
};

const categoryOptions = [
  ["all", "Todos"],
  ["service", "Serviço"],
  ["product", "Produto"],
  ["production", "Produção"],
] as const;

const modeOptions = [
  ["all", "Todas"],
  ["quick", "Rápido"],
  ["detailed", "Detalhado"],
] as const;

const situationOptions = [
  ["all", "Todas"],
  ["positive", "Resultado positivo"],
  ["break_even", "Zero a zero"],
  ["loss", "Com perda ou prejuízo"],
  ["no_sales", "Mês sem vendas"],
  ["pending", "Dados incompletos"],
] as const;

const dataStateOptions = [
  ["all", "Todos"],
  ["complete", "Completos"],
  ["pending", "Com dados pendentes"],
] as const;

const scenarioOptions = {
  service: [
    ["hour", "Por hora"],
    ["minute", "Por minuto"],
    ["appointment", "Por atendimento"],
    ["day", "Por dia"],
    ["week", "Por semana"],
    ["month", "Por mês"],
  ],
  product: [
    ["resale", "Revenda"],
    ["digital", "Produto digital"],
  ],
  production: [["manufacturing", "Fabricação própria"]],
} as const satisfies Record<
  DashboardCategory,
  readonly (readonly [ReportScenario, string])[]
>;

const priorityOptions = [
  ["cost", "Revisar custos"],
  ["data", "Completar dados"],
  ["price", "Revisar preço"],
  ["margin", "Avaliar margem"],
  ["volume", "Avaliar volume"],
] as const satisfies readonly (readonly [ReportPriority, string])[];

function situationFromFilters(filters: ClientDashboardFilters): Situation {
  if (filters.dataState === "pending") return "pending";
  const verdicts = filters.verdicts;
  if (verdicts.length === 1 && verdicts[0] === "positive_result")
    return "positive";
  if (verdicts.length === 1 && verdicts[0] === "break_even")
    return "break_even";
  if (verdicts.length === 1 && verdicts[0] === "no_sales") return "no_sales";
  if (
    verdicts.length === 2 &&
    verdicts.includes("direct_loss") &&
    verdicts.includes("operational_loss")
  )
    return "loss";
  return "all";
}

function toDraft(filters: ClientDashboardFilters): FilterDraft {
  return {
    from: filters.from ?? "",
    until: filters.to ? previousCalendarDate(filters.to) : "",
    category: filters.categories[0] ?? "all",
    mode: filters.modes[0] ?? "all",
    situation: situationFromFilters(filters),
    dataState: filters.dataState,
    scenario: filters.scenarios[0] ?? "all",
    priority: filters.priorities[0] ?? "all",
  };
}

function verdictsForSituation(situation: Situation): ReportVerdict[] {
  if (situation === "positive") return ["positive_result"];
  if (situation === "break_even") return ["break_even"];
  if (situation === "loss") return ["direct_loss", "operational_loss"];
  if (situation === "no_sales") return ["no_sales"];
  return [];
}

function availableScenarios(category: FilterDraft["category"]) {
  if (category === "all") return Object.values(scenarioOptions).flat();
  return scenarioOptions[category];
}

function selectClassName() {
  return "border-input bg-card h-11 w-full min-w-0 rounded-lg border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20";
}

function DashboardFilterFields({
  draft,
  setDraft,
  pending,
  scope = "all",
}: {
  draft: FilterDraft;
  setDraft: (next: FilterDraft) => void;
  pending: boolean;
  scope?: "all" | "primary" | "more";
}) {
  const scenarios = availableScenarios(draft.category);

  function update<Key extends keyof FilterDraft>(
    key: Key,
    value: FilterDraft[Key],
  ) {
    const next = { ...draft, [key]: value };
    if (key === "category") {
      const category = value as FilterDraft["category"];
      if (category === "service" && next.mode === "detailed") {
        next.mode = "all";
      }
      if (
        next.scenario !== "all" &&
        !availableScenarios(category).some(
          ([scenario]) => scenario === next.scenario,
        )
      ) {
        next.scenario = "all";
      }
    }
    if (key === "situation") {
      next.dataState = value === "pending" ? "pending" : "all";
    }
    if (key === "dataState" && next.situation === "pending") {
      next.situation = value === "pending" ? "pending" : "all";
    }
    setDraft(next);
  }

  return (
    <>
      {scope !== "more" ? (
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          De
          <Input
            className="h-11"
            type="date"
            value={draft.from}
            disabled={pending}
            onChange={(event) => update("from", event.target.value)}
          />
        </label>
      ) : null}
      {scope !== "more" ? (
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Até
          <Input
            className="h-11"
            type="date"
            value={draft.until}
            disabled={pending}
            onChange={(event) => update("until", event.target.value)}
          />
        </label>
      ) : null}
      {scope !== "more" ? (
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Categoria
          <select
            className={selectClassName()}
            value={draft.category}
            disabled={pending}
            onChange={(event) =>
              update("category", event.target.value as FilterDraft["category"])
            }
          >
            {categoryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {scope !== "more" ? (
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Modalidade
          <select
            className={selectClassName()}
            value={draft.mode}
            disabled={pending}
            onChange={(event) =>
              update("mode", event.target.value as FilterDraft["mode"])
            }
          >
            {modeOptions
              .filter(
                ([value]) =>
                  value !== "detailed" || draft.category !== "service",
              )
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
      ) : null}
      {scope !== "more" ? (
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Situação
          <select
            className={selectClassName()}
            value={draft.situation}
            disabled={pending}
            onChange={(event) =>
              update("situation", event.target.value as Situation)
            }
          >
            {situationOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {scope !== "more" ? (
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Estado dos dados
          <select
            className={selectClassName()}
            value={draft.dataState}
            disabled={pending}
            onChange={(event) =>
              update("dataState", event.target.value as DashboardDataState)
            }
          >
            {dataStateOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {scope !== "primary" ? (
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Cenário
          <select
            className={selectClassName()}
            value={draft.scenario}
            disabled={pending}
            onChange={(event) =>
              update("scenario", event.target.value as FilterDraft["scenario"])
            }
          >
            <option value="all">Todos</option>
            {scenarios.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {scope !== "primary" ? (
        <label className="grid min-w-0 gap-1.5 text-sm font-medium">
          Prioridade
          <select
            className={selectClassName()}
            value={draft.priority}
            disabled={pending}
            onChange={(event) =>
              update("priority", event.target.value as FilterDraft["priority"])
            }
          >
            <option value="all">Todas</option>
            {priorityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}

function formatDateChip(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

type FilterChip = { label: string; href: string };

function activeChips(
  filters: ClientDashboardFilters,
  draft: FilterDraft,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.from)
    chips.push({
      label: `De ${formatDateChip(filters.from)}`,
      href: buildClientDashboardHref(filters, { from: null }),
    });
  if (filters.to)
    chips.push({
      label: `Até ${formatDateChip(previousCalendarDate(filters.to))}`,
      href: buildClientDashboardHref(filters, { to: null }),
    });
  if (filters.categories.length)
    chips.push({
      label:
        categoryOptions.find(([value]) => value === draft.category)?.[1] ??
        "Categoria",
      href: buildClientDashboardHref(filters, { categories: [] }),
    });
  if (filters.modes.length)
    chips.push({
      label:
        modeOptions.find(([value]) => value === draft.mode)?.[1] ??
        "Modalidade",
      href: buildClientDashboardHref(filters, { modes: [] }),
    });
  if (draft.situation !== "all")
    chips.push({
      label:
        situationOptions.find(([value]) => value === draft.situation)?.[1] ??
        "Situação",
      href: buildClientDashboardHref(filters, {
        verdicts: [],
        dataState: draft.situation === "pending" ? "all" : filters.dataState,
      }),
    });
  else if (filters.verdicts.length)
    chips.push({
      label: "Situação selecionada",
      href: buildClientDashboardHref(filters, { verdicts: [] }),
    });
  if (filters.dataState !== "all" && draft.situation !== "pending")
    chips.push({
      label:
        dataStateOptions.find(([value]) => value === filters.dataState)?.[1] ??
        "Estado dos dados",
      href: buildClientDashboardHref(filters, { dataState: "all" }),
    });
  if (filters.scenarios.length)
    chips.push({
      label:
        availableScenarios(draft.category).find(
          ([value]) => value === draft.scenario,
        )?.[1] ?? "Cenário",
      href: buildClientDashboardHref(filters, { scenarios: [] }),
    });
  if (filters.priorities.length)
    chips.push({
      label:
        priorityOptions.find(([value]) => value === draft.priority)?.[1] ??
        "Prioridade",
      href: buildClientDashboardHref(filters, { priorities: [] }),
    });
  return chips;
}

function DashboardFiltersContent({
  filters,
}: {
  filters: ClientDashboardFilters;
}) {
  const router = useRouter();
  const initialDraft = useMemo(() => toDraft(filters), [filters]);
  const [draft, setDraft] = useState(initialDraft);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const chips = activeChips(filters, initialDraft);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailed(false);
    const href = buildClientDashboardHref(filters, {
      from: draft.from || null,
      to: draft.until ? nextCalendarDate(draft.until) : null,
      categories: draft.category === "all" ? [] : [draft.category],
      modes: draft.mode === "all" ? [] : [draft.mode],
      scenarios: draft.scenario === "all" ? [] : [draft.scenario],
      verdicts: verdictsForSituation(draft.situation),
      priorities: draft.priority === "all" ? [] : [draft.priority],
      dataState: draft.situation === "pending" ? "pending" : draft.dataState,
    });
    startTransition(() => {
      try {
        router.replace(href, { scroll: false });
        setMobileFiltersOpen(false);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <section aria-label="Filtros dos relatórios" className="grid gap-3">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <h2
          id="dashboard-filters-title-mobile"
          className="text-lg font-semibold"
        >
          Recorte dos relatórios
        </h2>
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger
            render={<Button type="button" variant="outline" className="h-11" />}
            aria-label={
              chips.length ? `Filtros, ${chips.length} ativos` : "Filtros"
            }
          >
            <FilterIcon aria-hidden="true" />
            Filtros
            {chips.length ? (
              <Badge variant="info" className="text-foreground">
                {chips.length}
              </Badge>
            ) : null}
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[min(92vw,24rem)] overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>Filtrar relatórios</SheetTitle>
              <SheetDescription>
                Escolha o recorte que deseja analisar.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={submit} className="grid gap-4 px-4 pb-6">
              <DashboardFilterFields
                draft={draft}
                setDraft={setDraft}
                pending={pending}
              />
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "Aplicando..." : "Aplicar filtros"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="bg-card hidden rounded-2xl border p-4 shadow-sm md:block">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="grid gap-1">
            <h2 id="dashboard-filters-title" className="font-semibold">
              Recorte dos relatórios
            </h2>
            <p className="text-muted-foreground text-sm">
              Refine os diagnósticos usados nesta visão geral.
            </p>
          </div>
          <Popover>
            <PopoverTrigger
              render={
                <Button type="button" variant="outline" className="h-11" />
              }
            >
              <SlidersHorizontalIcon aria-hidden="true" />
              Mais filtros
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4">
              <PopoverHeader>
                <PopoverTitle>Cenário e prioridade</PopoverTitle>
              </PopoverHeader>
              <div className="grid gap-4">
                <DashboardFilterFields
                  draft={draft}
                  setDraft={setDraft}
                  pending={pending}
                  scope="more"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="grid grid-cols-2 items-end gap-3 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]"
        >
          <DashboardFilterFields
            draft={draft}
            setDraft={setDraft}
            pending={pending}
            scope="primary"
          />
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="col-span-2 xl:col-span-1"
          >
            {pending ? "Aplicando..." : "Aplicar filtros"}
          </Button>
        </form>
      </div>

      {chips.length ? (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Filtros ativos"
        >
          {chips.map((chip) => (
            <Link
              key={`${chip.label}-${chip.href}`}
              href={chip.href}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "h-11 gap-1.5 rounded-full px-3",
              )}
            >
              {chip.label}
              <XIcon aria-hidden="true" />
              <span className="sr-only">Remover filtro</span>
            </Link>
          ))}
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-11",
            )}
          >
            Limpar filtros
          </Link>
        </div>
      ) : null}
      {failed ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível aplicar os filtros. Tente novamente.
        </p>
      ) : null}
    </section>
  );
}

function DashboardFilters({ filters }: { filters: ClientDashboardFilters }) {
  return (
    <DashboardFiltersContent
      key={buildClientDashboardHref(filters, {})}
      filters={filters}
    />
  );
}

export { DashboardFilters };
