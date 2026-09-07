import Link from "next/link";
import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDollarSignIcon,
  CircleGaugeIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  formatBasisPoints,
  formatCurrency,
  formatReportDate,
} from "../formatters";
import { getReportLanguageProfile } from "../presenters/report-language";
import type { OwnedReportSummary } from "../services/list-reports.service";
import type { ReportScenario, ReportVerdict } from "../types";

const categoryLabels = {
  service: "Serviço",
  product: "Produto",
  production: "Produção",
} as const satisfies Record<OwnedReportSummary["businessCategory"], string>;

const scenarioLabels = {
  hour: "Por hora",
  minute: "Por minuto",
  appointment: "Por atendimento",
  resale: "Revenda",
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
  tight_margin: {
    badge: "warning",
    icon: CircleAlertIcon,
  },
  adequate_margin: {
    badge: "success",
    icon: CircleCheckIcon,
  },
  above_target: {
    badge: "success",
    icon: CircleCheckIcon,
  },
};

function optionalCurrency(value: number | null): string {
  return value === null ? "Indisponível" : formatCurrency(value);
}

function optionalMargin(value: number | null): string {
  return value === null ? "Indisponível" : formatBasisPoints(value);
}

function ReportListCard({ report }: { report: OwnedReportSummary }) {
  const language = getReportLanguageProfile({
    category: report.businessCategory,
    contentVersion: report.contentVersion,
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
  const marginLabel = language.isPlainLanguage
    ? "Quanto sobra a cada R$ 100"
    : "Margem real";
  const profitLabel = language.isPlainLanguage
    ? report.businessCategory === "product" ||
      report.businessCategory === "production"
      ? "Quanto sobra por unidade"
      : report.unit === "hour"
        ? "Quanto sobra por hora"
        : "Quanto sobra por atendimento"
    : report.businessCategory === "product" ||
        report.businessCategory === "production"
      ? "Lucro por unidade"
      : "Lucro por venda";

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
        <dl className="border-border/70 bg-muted/25 grid grid-cols-2 overflow-hidden rounded-xl border sm:grid-cols-3">
          <div className="col-span-2 grid gap-1 border-b p-3.5 sm:col-span-1 sm:border-r sm:border-b-0">
            <dt className="text-muted-foreground text-xs">Preço atual</dt>
            <dd className="text-lg font-semibold tracking-tight tabular-nums">
              {formatCurrency(report.currentPriceCents)}
            </dd>
          </div>
          <div className="grid gap-1 border-r p-3.5">
            <dt className="text-muted-foreground text-xs">{marginLabel}</dt>
            <dd className="font-semibold tabular-nums">
              {optionalMargin(report.realMarginBasisPoints)}
            </dd>
          </div>
          <div className="grid gap-1 p-3.5">
            <dt className="text-muted-foreground text-xs">{profitLabel}</dt>
            <dd className="font-semibold tabular-nums">
              {optionalCurrency(report.unitProfitCents)}
            </dd>
          </div>
        </dl>

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
