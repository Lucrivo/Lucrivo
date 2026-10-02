import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
  formatReportDate,
  formatReportScenario,
} from "@/modules/reports/formatters";
import type { ReportPriority, ReportVerdict } from "@/modules/reports/types";

import type {
  ClientDashboardFilters,
  DashboardCategory,
  DashboardMode,
} from "./client-dashboard.filters";
import type { ClientDashboardSnapshot } from "./client-dashboard.schema";
import type {
  ClientDashboardViewModel,
  DashboardRecentReportViewModel,
  DashboardTone,
} from "./client-dashboard.types";

const verdictPresentation = {
  missing_price: { label: "Preço não informado", tone: "info" },
  direct_loss: { label: "Perda por venda", tone: "danger" },
  incomplete_volume: { label: "Volume não informado", tone: "info" },
  operational_loss: {
    label: "Prejuízo no cenário informado",
    tone: "danger",
  },
  no_sales: { label: "Mês sem vendas", tone: "info" },
  break_even: { label: "Zero a zero", tone: "warning" },
  positive_result: { label: "Resultado positivo", tone: "success" },
} as const satisfies Record<
  ReportVerdict,
  { label: string; tone: DashboardTone }
>;

const priorityPresentation = {
  cost: "Revisar custos",
  data: "Completar dados",
  price: "Revisar preço",
  margin: "Avaliar margem",
  volume: "Avaliar volume",
} as const satisfies Record<ReportPriority, string>;

const categoryPresentation = {
  service: { label: "Serviço", title: "Diagnóstico de Serviço" },
  product: { label: "Produto", title: "Diagnóstico de Produto" },
  production: { label: "Produção", title: "Diagnóstico de Produção" },
} as const satisfies Record<
  DashboardCategory,
  { label: string; title: string }
>;

const analysisModePresentation = {
  quick: "Rápido",
  detailed: "Detalhado",
} as const satisfies Record<DashboardMode, string>;

function presentVerdict(verdict: ReportVerdict) {
  return verdictPresentation[verdict];
}

function presentPriority(priority: ReportPriority): string {
  return priorityPresentation[priority];
}

function presentCategory(category: DashboardCategory): string {
  return categoryPresentation[category].label;
}

function presentAnalysisMode(mode: DashboardMode): string {
  return analysisModePresentation[mode];
}

function toRecentReportViewModel(
  report: ClientDashboardSnapshot["recentReports"][number],
): DashboardRecentReportViewModel {
  const category = categoryPresentation[report.businessCategory];

  return {
    id: report.id,
    title: category.title,
    categoryLabel: category.label,
    scenarioLabel: formatReportScenario(report.scenario),
    modeLabel: presentAnalysisMode(report.analysisMode),
    createdAtLabel: formatReportDate(report.createdAt),
    verdict: presentVerdict(report.verdict),
    priorityLabel: presentPriority(report.priority),
    dataStateLabel: report.hasPendingData
      ? "Dados pendentes"
      : "Dados completos",
    itemCountLabel:
      report.itemCount === null
        ? null
        : `${formatIntegerVolume(report.itemCount)} ${report.itemCount === 1 ? "item" : "itens"}`,
    monthlyResultLabel:
      report.monthlyResultCents === null
        ? null
        : formatCurrency(report.monthlyResultCents),
    realMarginLabel:
      report.realMarginBasisPoints === null
        ? null
        : formatBasisPoints(report.realMarginBasisPoints),
    openHref: `/reports/${report.id}`,
  };
}

function toClientDashboardViewModel(
  snapshot: ClientDashboardSnapshot,
  filters: ClientDashboardFilters,
): ClientDashboardViewModel {
  void filters;

  return {
    generatedAtLabel: formatReportDate(snapshot.generatedAt),
    hasAnyReports: snapshot.hasAnyReports,
    focusReportId: snapshot.focusReportId,
    metrics: snapshot.metrics,
    verdictCounts: snapshot.verdictCounts.map(({ verdict, count }) => ({
      verdict,
      count,
      ...presentVerdict(verdict),
    })),
    priorityCounts: snapshot.priorityCounts.map(({ priority, count }) => ({
      priority,
      count,
      label: presentPriority(priority),
    })),
    recentReports: snapshot.recentReports.map(toRecentReportViewModel),
  };
}

export {
  presentAnalysisMode,
  presentCategory,
  presentPriority,
  presentVerdict,
  toClientDashboardViewModel,
};
