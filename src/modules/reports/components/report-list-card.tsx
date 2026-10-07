import Link from "next/link";
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDollarSignIcon,
  CircleGaugeIcon,
  CircleHelpIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
  formatReportDate,
} from "../formatters";
import { getReportLanguageProfile } from "../presenters/report-language";
import type { OwnedReportSummary } from "../services/list-reports.service";
import type { ReportScenario, ReportTone, ReportVerdict } from "../types";
import { tonePresentation } from "./report-tone";

const categoryLabels = {
  service: "Serviço",
  product: "Produto",
  production: "Produção",
} as const satisfies Record<OwnedReportSummary["businessCategory"], string>;

const scenarioLabels = {
  hour: "Por hora",
  minute: "Por minuto",
  appointment: "Por atendimento",
  day: "Por dia",
  week: "Por semana",
  month: "Por mês",
  resale: "Revenda",
  digital: "Produto digital",
  manufacturing: "Fabricação própria",
} as const satisfies Record<ReportScenario, string>;

const verdictPresentation: Record<
  ReportVerdict,
  {
    badge: "info" | "success" | "warning" | "destructive";
    icon: typeof CircleGaugeIcon;
  }
> = {
  missing_price: {
    badge: "info",
    icon: CircleGaugeIcon,
  },
  direct_loss: {
    badge: "destructive",
    icon: CircleAlertIcon,
  },
  incomplete_volume: {
    badge: "info",
    icon: CircleGaugeIcon,
  },
  operational_loss: {
    badge: "destructive",
    icon: CircleAlertIcon,
  },
  no_sales: {
    badge: "info",
    icon: CircleGaugeIcon,
  },
  break_even: {
    badge: "warning",
    icon: CircleAlertIcon,
  },
  positive_result: {
    badge: "success",
    icon: CircleCheckIcon,
  },
};

type SummaryMetric = {
  key: "price" | "margin" | "goal" | "volume";
  label: string;
  value: string;
  tone: ReportTone;
  helpText?: string;
};

const metricToneStyles = {
  neutral: "bg-muted/15",
  positive: "bg-success/6",
  warning: "bg-warning/7",
  critical: "bg-destructive/6",
} as const satisfies Record<ReportTone, string>;

const metricToneLabels = {
  neutral: "Informativo",
  positive: "Positivo",
  warning: "Atenção",
  critical: "Negativo",
} as const satisfies Record<ReportTone, string>;

function resultTone(value: number | null): ReportTone {
  if (value === null) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "critical";
  return "warning";
}

function salesTone(report: OwnedReportSummary): ReportTone {
  if (report.monthlySalesGoal === null || report.monthlySalesVolume === null) {
    return "neutral";
  }
  return report.monthlySalesVolume >= report.monthlySalesGoal
    ? "positive"
    : "critical";
}

function formatSalesCount(report: OwnedReportSummary, value: number): string {
  const formatted = formatIntegerVolume(value);
  if (report.businessCategory === "service") {
    if (report.unit === "hour") return `${formatted} horas`;
    return `${formatted} atendimentos`;
  }
  return report.businessCategory === "production" ||
    report.analysisMode === "detailed"
    ? `${formatted} unidades`
    : `${formatted} vendas`;
}

function marginUnavailableReason(report: OwnedReportSummary): string {
  if (report.verdict === "missing_price") {
    return "A margem não pode ser calculada sem um preço válido.";
  }
  if (report.verdict === "incomplete_volume" || report.isPartial) {
    return "A margem depende das quantidades mensais que ainda não foram informadas.";
  }
  return "Os dados salvos neste diagnóstico não permitem calcular a margem.";
}

function goalUnavailableReason(report: OwnedReportSummary): string {
  if (report.verdict === "direct_loss") {
    return "No preço atual, cada venda não deixa valor suficiente para pagar os gastos do mês.";
  }
  if (report.analysisMode === "detailed" && report.isPartial) {
    return "A quantidade necessária depende das vendas mensais de todos os itens do conjunto.";
  }
  return "Os dados salvos neste diagnóstico não permitem calcular uma quantidade necessária.";
}

function buildSummaryMetrics(report: OwnedReportSummary): SummaryMetric[] {
  const comparisonTone = salesTone(report);
  const metrics: SummaryMetric[] = [
    {
      key: "price",
      label: "Preço atual",
      value:
        report.currentPriceCents === null
          ? "Vários preços"
          : formatCurrency(report.currentPriceCents),
      tone: "neutral",
      ...(report.currentPriceCents === null
        ? {
            helpText:
              "Este diagnóstico reúne vários itens, cada um com seu próprio preço de venda.",
          }
        : {}),
    },
    {
      key: "margin",
      label: "Margem",
      value:
        report.realMarginBasisPoints === null
          ? "Não calculável"
          : formatBasisPoints(report.realMarginBasisPoints),
      tone: resultTone(report.realMarginBasisPoints),
      ...(report.realMarginBasisPoints === null
        ? { helpText: marginUnavailableReason(report) }
        : {}),
    },
    {
      key: "goal",
      label:
        report.businessCategory === "service"
          ? "Serviços necessários"
          : "Quantidade de vendas necessárias",
      value:
        report.monthlySalesGoal === null
          ? "Não calculável"
          : formatSalesCount(report, report.monthlySalesGoal),
      tone: comparisonTone,
      ...(report.monthlySalesGoal === null
        ? { helpText: goalUnavailableReason(report) }
        : {}),
    },
  ];

  if (report.businessCategory !== "service") {
    metrics.push({
      key: "volume",
      label: "Volume de vendas",
      value:
        report.monthlySalesVolume === null
          ? "Não informado"
          : formatSalesCount(report, report.monthlySalesVolume),
      tone: comparisonTone,
      ...(report.monthlySalesVolume === null
        ? {
            helpText:
              report.analysisMode === "detailed"
                ? "O volume total depende das quantidades mensais de todos os itens do conjunto."
                : "O volume mensal de vendas não foi informado neste diagnóstico.",
          }
        : {}),
    });
  }

  return metrics;
}

function metricCellBorder(index: number, count: number): string {
  if (count === 3) {
    return index < 2 ? "border-b sm:border-r sm:border-b-0" : "";
  }
  if (index === 0) return "border-r border-b sm:border-b-0";
  if (index === 1) return "border-b sm:border-r sm:border-b-0";
  if (index === 2) return "border-r";
  return "";
}

function ReportSummaryMetrics({ report }: { report: OwnedReportSummary }) {
  const metrics = buildSummaryMetrics(report);

  return (
    <dl
      className={cn(
        "border-border/70 bg-muted/25 grid overflow-hidden rounded-xl border",
        metrics.length === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {metrics.map((metric, index) => {
        const presentation = tonePresentation[metric.tone];
        const ToneIcon = presentation.icon;
        const hasStatus = metric.tone !== "neutral";

        return (
          <div
            key={metric.key}
            data-metric={metric.key}
            data-tone={metric.tone}
            className={cn(
              "grid min-w-0 content-start gap-1.5 p-3.5",
              metricCellBorder(index, metrics.length),
              metricToneStyles[metric.tone],
            )}
          >
            <dt className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs leading-4">
              <span>{metric.label}</span>
              {metric.helpText ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      aria-label={`Entenda por que ${metric.label.toLowerCase()} está ${metric.value.toLowerCase()}`}
                      closeOnClick={false}
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -m-3 grid size-11 shrink-0 place-items-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <CircleHelpIcon aria-hidden="true" className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent role="tooltip">
                      {metric.helpText}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </dt>
            <dd
              className={cn(
                "flex min-w-0 items-center gap-1.5 text-base leading-tight font-semibold tracking-tight wrap-break-word tabular-nums",
                hasStatus ? presentation.value : "text-foreground",
              )}
            >
              {hasStatus ? (
                <>
                  <ToneIcon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="sr-only">
                    {metricToneLabels[metric.tone]}:{" "}
                  </span>
                </>
              ) : null}
              <span>{metric.value}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function DetailedReportListCard({ report }: { report: OwnedReportSummary }) {
  const category = categoryLabels[report.businessCategory];
  const scenario =
    scenarioLabels[report.scenario as ReportScenario] ?? report.scenario;
  const language = getReportLanguageProfile({
    category: report.businessCategory,
    schemaVersion: report.schemaVersion,
    calculationVersion: report.calculationVersion,
    contentVersion: report.contentVersion,
    analysisMode: report.analysisMode,
  });
  const verdict =
    verdictPresentation[report.verdict as ReportVerdict] ??
    verdictPresentation.missing_price;
  const VerdictIcon = verdict.icon;
  const verdictLabel =
    language.verdictLabels[report.verdict as ReportVerdict] ??
    language.verdictLabels.missing_price;
  const title =
    report.businessCategory === "product"
      ? "Análise de produtos"
      : "Análise de produções";
  const itemCount = report.itemCount ?? 0;

  return (
    <Card
      role="article"
      aria-label={`${title} — ${scenario}`}
      className="group border-border/70 hover:border-primary/30 relative h-full overflow-hidden py-0 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
    >
      <div
        aria-hidden="true"
        className="from-primary/11 via-info/50 absolute inset-x-0 top-0 h-1 bg-linear-to-r to-transparent"
      />
      <CardHeader className="gap-4 px-5 pt-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{category}</Badge>
              <Badge variant="outline">{scenario}</Badge>
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          </div>
          <Badge variant={verdict.badge}>
            <VerdictIcon aria-hidden="true" />
            {verdictLabel}
          </Badge>
        </div>
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <CalendarDaysIcon aria-hidden="true" className="size-3.5" />
          {formatReportDate(report.createdAt)} ·{" "}
          <span>
            {itemCount}{" "}
            {itemCount === 1 ? "item analisado" : "itens analisados"}
          </span>
        </p>
      </CardHeader>

      <CardContent className="grid flex-1 gap-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <ReportSummaryMetrics report={report} />

        <div className="flex items-center justify-end">
          <Link
            href={`/reports/${report.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "group-hover:border-primary/40",
            )}
          >
            Abrir relatório
            <ArrowUpRightIcon aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportListCard({ report }: { report: OwnedReportSummary }) {
  if (report.analysisMode === "detailed")
    return <DetailedReportListCard report={report} />;

  const language = getReportLanguageProfile({
    category: report.businessCategory,
    schemaVersion: report.schemaVersion,
    calculationVersion: report.calculationVersion,
    contentVersion: report.contentVersion,
    analysisMode: report.analysisMode,
  });
  const category = categoryLabels[report.businessCategory];
  const scenario =
    scenarioLabels[report.scenario as ReportScenario] ?? report.scenario;
  const verdict =
    verdictPresentation[report.verdict as ReportVerdict] ??
    verdictPresentation.missing_price;
  const VerdictIcon = verdict.icon;
  const verdictLabel =
    language.verdictLabels[report.verdict as ReportVerdict] ??
    language.verdictLabels.missing_price;

  return (
    <Card
      role="article"
      aria-label={`Diagnóstico de ${category} — ${scenario}`}
      className="group border-border/70 hover:border-primary/30 relative h-full overflow-hidden py-0 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
    >
      <div
        aria-hidden="true"
        className="from-primary/11 via-info/50 absolute inset-x-0 top-0 h-1 bg-linear-to-r to-transparent"
      />
      <CardHeader className="gap-4 px-5 pt-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{category}</Badge>
              <Badge variant="outline">{scenario}</Badge>
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Diagnóstico de {category}
            </h2>
          </div>
          <Badge variant={verdict.badge}>
            <VerdictIcon aria-hidden="true" />
            {verdictLabel}
          </Badge>
        </div>
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <CalendarDaysIcon aria-hidden="true" className="size-3.5" />
          {formatReportDate(report.createdAt)}
        </p>
      </CardHeader>

      <CardContent className="grid flex-1 gap-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <ReportSummaryMetrics report={report} />

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground flex items-center gap-2 text-xs">
            <CircleDollarSignIcon aria-hidden="true" className="size-4" />
            {language.savedReportLabel}
          </span>
          <Link
            href={`/reports/${report.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "group-hover:border-primary/40",
            )}
          >
            Abrir relatório
            <ArrowUpRightIcon aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export { ReportListCard };
