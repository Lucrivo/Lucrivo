"use client";

import { useId, useState } from "react";
import {
  CircleCheckIcon,
  GaugeIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { multiplyDivideRound } from "../domain/integer-math";
import { formatBasisPoints, formatCurrency } from "../formatters";
import type { ReportDiscountSimulationBase } from "../types";

type DiscountSimulationStatus =
  "unavailable" | "positive_result" | "break_even" | "loss";

type DiscountSimulationContext = {
  category: "service" | "product" | "production";
};

type DiscountSimulation = {
  discountPercent: number;
  discountedPriceCents: number | null;
  unitProfitCents: number | null;
  realMarginBasisPoints: number | null;
  status: DiscountSimulationStatus;
};

const statusPresentation = {
  unavailable: {
    icon: GaugeIcon,
    className: "border-border bg-muted/55 text-muted-foreground",
  },
  positive_result: {
    icon: CircleCheckIcon,
    className: "border-success/25 bg-success/8 text-success",
  },
  break_even: {
    icon: TriangleAlertIcon,
    className: "border-warning/35 bg-warning/12 text-warning-foreground",
  },
  loss: {
    icon: OctagonAlertIcon,
    className: "border-destructive/25 bg-destructive/8 text-destructive",
  },
} satisfies Record<
  DiscountSimulationStatus,
  { icon: typeof GaugeIcon; className: string }
>;

function clampDiscount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(50, Math.max(0, Math.round(value)));
}

function simulateDiscount(
  base: ReportDiscountSimulationBase,
  requestedDiscountPercent: number,
): DiscountSimulation {
  const discountPercent = clampDiscount(requestedDiscountPercent);
  const { minimumPriceCents, originalPriceCents, unitCostCents } = base;

  if (
    originalPriceCents <= 0 ||
    minimumPriceCents === null ||
    minimumPriceCents < 0 ||
    unitCostCents === null
  ) {
    return {
      discountPercent,
      discountedPriceCents: null,
      unitProfitCents: null,
      realMarginBasisPoints: null,
      status: "unavailable",
    };
  }

  const discountedPriceCents = multiplyDivideRound(
    originalPriceCents,
    100 - discountPercent,
    100,
  );
  const netRevenueCents = multiplyDivideRound(
    discountedPriceCents,
    10_000 - base.totalFeeBasisPoints,
    10_000,
  );
  const unitProfitCents = netRevenueCents - unitCostCents;
  const realMarginBasisPoints =
    discountedPriceCents === 0
      ? null
      : multiplyDivideRound(unitProfitCents, 10_000, discountedPriceCents);
  const status: DiscountSimulationStatus =
    unitProfitCents > 0
      ? "positive_result"
      : unitProfitCents === 0
        ? "break_even"
        : "loss";

  return {
    discountPercent,
    discountedPriceCents,
    unitProfitCents,
    realMarginBasisPoints,
    status,
  };
}

function safetyMessage(simulation: DiscountSimulation): string {
  switch (simulation.status) {
    case "unavailable":
      return "Para calcular um desconto seguro, primeiro precisamos de uma quantidade para dividir os gastos do mês.";
    case "positive_result":
      return `Resultado positivo: com este desconto, o preço ainda paga os valores considerados e deixa ${formatCurrency(simulation.unitProfitCents ?? 0)} por venda.`;
    case "break_even":
      return "No limite: com este desconto, o preço paga exatamente os valores considerados, sem deixar sobra por venda.";
    case "loss":
      return `Prejuízo: com este desconto, faltam ${formatCurrency(Math.abs(simulation.unitProfitCents ?? 0))} por venda para pagar os valores considerados.`;
  }
}

function optionalCurrency(value: number | null): string {
  return value === null ? "Indisponível" : formatCurrency(value);
}

function optionalMargin(value: number | null): string {
  return value === null ? "Indisponível" : formatBasisPoints(value);
}

function DiscountSimulator({
  base,
  context,
}: {
  base: ReportDiscountSimulationBase;
  context: DiscountSimulationContext;
}) {
  const inputId = useId();
  const statusId = useId();
  const [discountPercent, setDiscountPercent] = useState(10);
  const simulation = simulateDiscount(base, discountPercent);
  const presentation = statusPresentation[simulation.status];
  const StatusIcon = presentation.icon;
  const unitLabel = context.category === "service" ? "serviço" : "unidade";

  return (
    <Card
      data-testid="report-section"
      className="border-primary/25 from-primary/7 via-card to-info/7 relative bg-linear-to-br py-0 shadow-sm"
    >
      <CardHeader className="gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="max-w-2xl text-lg font-semibold sm:text-xl">
            Quanto de desconto posso dar sem ter prejuízo?
          </h3>
          <Badge variant="info">
            <GaugeIcon aria-hidden="true" />
            <span className="sr-only">Informação</span>
            Simulação interativa
          </Badge>
        </div>
        <p className="text-muted-foreground max-w-3xl text-[0.9375rem] leading-6">
          Arraste para ver como o desconto muda o preço e quanto sobra depois de
          todos os valores considerados.
        </p>
      </CardHeader>

      <CardContent className="grid gap-6 px-5 pb-5 sm:px-6 sm:pb-6">
        <div
          data-testid="discount-simulator"
          className="border-primary/15 bg-background/80 grid min-w-0 gap-4 rounded-2xl border p-4 shadow-xs sm:p-5"
        >
          <div className="flex items-end justify-between gap-4">
            <label htmlFor={inputId} className="grid gap-1 font-medium">
              Desconto simulado
              <span className="text-muted-foreground text-xs font-normal">
                De 0% a 50% do preço atual
              </span>
            </label>
            <output
              htmlFor={inputId}
              className="text-primary text-3xl font-semibold tracking-tight tabular-nums"
            >
              {simulation.discountPercent}%
            </output>
          </div>

          <input
            id={inputId}
            type="range"
            min={0}
            max={50}
            step={1}
            value={simulation.discountPercent}
            disabled={simulation.status === "unavailable"}
            aria-label="Desconto simulado"
            aria-describedby={statusId}
            aria-valuetext={`${simulation.discountPercent}% de desconto`}
            onChange={(event) => setDiscountPercent(Number(event.target.value))}
            className="accent-primary h-6 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="border-border/70 bg-card grid min-w-0 gap-1 rounded-xl border p-3">
              <dt className="text-muted-foreground text-xs">Preço atual</dt>
              <dd className="font-semibold break-words tabular-nums">
                {formatCurrency(base.originalPriceCents)}
              </dd>
            </div>
            <div className="border-primary/20 bg-primary/6 grid min-w-0 gap-1 rounded-xl border p-3">
              <dt className="text-muted-foreground text-xs">Com desconto</dt>
              <dd className="text-primary font-semibold break-words tabular-nums">
                {optionalCurrency(simulation.discountedPriceCents)}
              </dd>
            </div>
            <div className="border-border/70 bg-card grid min-w-0 gap-1 rounded-xl border p-3">
              <dt className="text-muted-foreground text-xs">
                Quanto sobra a cada R$ 100
              </dt>
              <dd className="font-semibold break-words tabular-nums">
                {optionalMargin(simulation.realMarginBasisPoints)}
              </dd>
            </div>
            <div className="border-border/70 bg-card grid min-w-0 gap-1 rounded-xl border p-3">
              <dt className="text-muted-foreground text-xs">
                Quanto sobra por {unitLabel}
              </dt>
              <dd className="font-semibold break-words tabular-nums">
                {optionalCurrency(simulation.unitProfitCents)}
              </dd>
            </div>
          </dl>

          <p
            id={statusId}
            role="status"
            aria-live="polite"
            data-testid="discount-safety"
            className={cn(
              "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm leading-5 font-medium",
              presentation.className,
            )}
          >
            <StatusIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {safetyMessage(simulation)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export {
  DiscountSimulator,
  simulateDiscount,
  type DiscountSimulation,
  type DiscountSimulationContext,
  type DiscountSimulationStatus,
};
