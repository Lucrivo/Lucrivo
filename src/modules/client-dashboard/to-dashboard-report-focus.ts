import {
  formatIntegerVolume,
  formatReportDate,
  formatReportScenario,
} from "@/modules/reports/formatters";
import { toDetailedReportViewModel } from "@/modules/reports/presenters/to-detailed-report-view-model";
import {
  toReportViewModel,
  type ReportNumberViewModel,
} from "@/modules/reports/presenters/to-report-view-model";
import { isDetailedReportSnapshot } from "@/modules/reports/schemas/report-snapshot.schema";
import type { OwnedReport } from "@/modules/reports/services/get-report.service";

import {
  presentAnalysisMode,
  presentCategory,
  presentPriority,
  presentVerdict,
} from "./client-dashboard.formatters";
import type {
  DashboardComplementaryFact,
  DashboardReportFocusViewModel,
} from "./client-dashboard.types";

const quickFocusKeys = ["profit", "margin", "minimum", "sales"] as const;
const detailedFocusKeys = [
  "result",
  "margin",
  "break_even",
  "sales",
] as const;

function selectMetrics(
  numbers: ReportNumberViewModel[],
  keys: readonly ReportNumberViewModel["key"][],
): ReportNumberViewModel[] {
  return keys.map((key) => {
    const metric = numbers.find((candidate) => candidate.key === key);
    if (!metric) throw new Error(`missing_report_metric:${key}`);
    return metric;
  });
}

function updatedFact(report: OwnedReport): DashboardComplementaryFact[] {
  if (report.updatedAt === report.createdAt) return [];
  return [
    {
      key: "updated_at",
      label: "Última atualização",
      value: formatReportDate(report.updatedAt),
    },
  ];
}

function toDetailedFocus(report: OwnedReport): DashboardReportFocusViewModel {
  const snapshot = report.snapshot;
  if (!isDetailedReportSnapshot(snapshot)) {
    throw new Error("detailed_report_expected");
  }

  const presented = toDetailedReportViewModel({
    id: report.id,
    createdAt: report.createdAt,
    snapshot,
  });
  const directLossItems = snapshot.results.items.filter(
    ({ directLoss }) => directLoss,
  ).length;
  const missingVolumeItems = snapshot.results.missingVolumeItemIds.length;
  const complementaryFacts: DashboardComplementaryFact[] = [
    {
      key: "direct_loss_items",
      label: "Itens com perda por venda",
      value: formatIntegerVolume(directLossItems),
    },
    {
      key: "missing_volume_items",
      label: "Itens sem volume informado",
      value: formatIntegerVolume(missingVolumeItems),
    },
    {
      key: "analyzed_items",
      label: "Itens analisados",
      value: formatIntegerVolume(snapshot.inputs.items.length),
    },
    ...updatedFact(report),
  ];

  return {
    id: report.id,
    title: presented.identity.title,
    categoryLabel: presentCategory(snapshot.category),
    scenarioLabel: formatReportScenario(snapshot.scenario),
    modeLabel: presentAnalysisMode("detailed"),
    createdAtLabel: formatReportDate(report.createdAt),
    updatedAtLabel:
      report.updatedAt === report.createdAt
        ? null
        : formatReportDate(report.updatedAt),
    verdict: presentVerdict(snapshot.results.verdict),
    priorityLabel: presentPriority(snapshot.results.priority),
    metrics: selectMetrics(presented.numbers, detailedFocusKeys),
    complementaryFacts,
    openHref: `/reports/${report.id}`,
  };
}

function analyzedOfferFact(
  category: "service" | "product" | "production",
): DashboardComplementaryFact {
  const value = {
    service: "1 serviço analisado",
    product: "1 produto analisado",
    production: "1 produção analisada",
  } as const;

  return {
    key: "analyzed_items",
    label: "Ofertas analisadas",
    value: value[category],
  };
}

function toQuickFocus(report: OwnedReport): DashboardReportFocusViewModel {
  const snapshot = report.snapshot;
  if (isDetailedReportSnapshot(snapshot)) throw new Error("quick_report_expected");

  const presented = toReportViewModel({
    id: report.id,
    createdAt: report.createdAt,
    snapshot,
  });
  const complementaryFacts: DashboardComplementaryFact[] = [
    analyzedOfferFact(snapshot.category),
  ];

  if (snapshot.results.breakEvenDiscountPercent !== null) {
    complementaryFacts.push({
      key: "discount_limit",
      label: "Limite antes do prejuízo",
      value: `${snapshot.results.breakEvenDiscountPercent}%`,
      supportingText:
        "É um limite calculado, não uma recomendação de desconto.",
    });
  }
  complementaryFacts.push(...updatedFact(report));

  return {
    id: report.id,
    title: presented.identity.title,
    categoryLabel: presentCategory(snapshot.category),
    scenarioLabel: formatReportScenario(snapshot.scenario),
    modeLabel: presentAnalysisMode("quick"),
    createdAtLabel: formatReportDate(report.createdAt),
    updatedAtLabel:
      report.updatedAt === report.createdAt
        ? null
        : formatReportDate(report.updatedAt),
    verdict: presentVerdict(snapshot.results.verdict),
    priorityLabel: presentPriority(snapshot.results.priority),
    metrics: selectMetrics(presented.numbers, quickFocusKeys),
    complementaryFacts,
    openHref: `/reports/${report.id}`,
  };
}

function toDashboardReportFocus(
  report: OwnedReport,
): DashboardReportFocusViewModel {
  return isDetailedReportSnapshot(report.snapshot)
    ? toDetailedFocus(report)
    : toQuickFocus(report);
}

export { toDashboardReportFocus };
