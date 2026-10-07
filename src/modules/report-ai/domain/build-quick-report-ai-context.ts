import { deriveQuickBreakEvenScenario } from "@/modules/reports/domain/break-even-scenario";
import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "@/modules/reports/formatters";
import { toReportViewModel } from "@/modules/reports/presenters/to-report-view-model";
import { isDetailedReportSnapshot } from "@/modules/reports/schemas/report-snapshot.schema";
import type { OwnedReport } from "@/modules/reports/services/get-report.service";
import {
  PRODUCT_CONTENT_VERSION,
  PRODUCTION_CONTENT_VERSION,
} from "@/modules/reports/types";

import type {
  ReportAiContextV2,
  ReportAiFact,
} from "./report-ai-context.types";

function moneyFact(
  key: string,
  label: string,
  value: number | null,
  scope: ReportAiFact["scope"],
): ReportAiFact {
  return {
    key,
    label,
    value: value === null ? null : formatCurrency(value),
    scope,
  };
}

function percentageFact(
  key: string,
  label: string,
  value: number | null,
  scope: ReportAiFact["scope"],
): ReportAiFact {
  return {
    key,
    label,
    value: value === null ? null : formatBasisPoints(value),
    scope,
  };
}

function integerPercentageFact(
  key: string,
  label: string,
  value: number | null,
  scope: ReportAiFact["scope"],
): ReportAiFact {
  return { key, label, value: value === null ? null : `${value}%`, scope };
}

function volumeFact(
  key: string,
  label: string,
  value: number | null,
  unitLabel: string,
  scope: ReportAiFact["scope"] = "month",
): ReportAiFact {
  return {
    key,
    label,
    value: value === null ? null : `${formatIntegerVolume(value)} ${unitLabel}`,
    scope,
  };
}

function volumeState(
  value: number | null,
): "known_positive" | "known_zero" | "unknown" {
  if (value === null) return "unknown";
  return value === 0 ? "known_zero" : "known_positive";
}

function buildQuickReportAiContext(report: OwnedReport): ReportAiContextV2 {
  const snapshot = report.snapshot;
  if (isDetailedReportSnapshot(snapshot)) {
    throw new Error("quick_report_context_requires_quick_snapshot");
  }

  const visible = toReportViewModel(report);
  const base = {
    schemaVersion: 2 as const,
    report: {
      id: report.id,
      version: report.version,
      category: snapshot.category,
      scenario: snapshot.scenario,
      unit: snapshot.unit,
      analysisMode: "quick" as const,
    },
    explanations: {
      executiveSummary: visible.executiveSummary,
      sections: visible.sections,
      guidance: [],
      comparison: [],
    },
  };

  if (snapshot.category === "service") {
    const { results } = snapshot;
    const unitLabel = snapshot.unit === "hour" ? "horas" : "atendimentos";
    const facts: ReportAiFact[] = [
      moneyFact(
        "current_price",
        "Preço atual",
        results.currentPriceCents,
        "unit",
      ),
      moneyFact(
        "variable_unit_cost",
        "Custo direto",
        results.materialUnitCostCents,
        "unit",
      ),
      moneyFact(
        "structure_unit_cost",
        "Custo de estrutura",
        results.structureUnitCostCents,
        "unit",
      ),
      moneyFact(
        "total_unit_cost",
        "Custo completo",
        results.unitCostCents,
        "unit",
      ),
      moneyFact(
        "unit_contribution",
        "Valor deixado por serviço",
        results.unitContributionCents,
        "unit",
      ),
      moneyFact(
        "unit_profit",
        "Resultado por serviço",
        results.unitProfitCents,
        "unit",
      ),
      percentageFact(
        "sales_fees",
        "Impostos e cartão sobre a venda",
        results.totalFeeBasisPoints,
        "unit",
      ),
      percentageFact(
        "real_margin",
        "Quanto sobra a cada R$ 100",
        results.realMarginBasisPoints,
        "unit",
      ),
      moneyFact(
        "minimum_price",
        "Menor preço sem prejuízo",
        results.minimumPriceCents,
        "unit",
      ),
      volumeFact(
        "required_monthly_volume",
        "Quantidade necessária no mês",
        results.monthlySalesGoal,
        unitLabel,
      ),
      volumeFact(
        "required_weekly_volume",
        "Quantidade necessária por semana",
        results.weeklySalesGoal,
        unitLabel,
      ),
      volumeFact(
        "required_daily_volume",
        "Quantidade necessária por dia",
        results.dailySalesGoal,
        unitLabel,
      ),
      integerPercentageFact(
        "break_even_discount",
        "Limite de desconto sem prejuízo",
        results.breakEvenDiscountPercent,
        "unit",
      ),
    ];
    const reasons: string[] = [];
    if (results.currentPriceCents <= 0) {
      reasons.push("Informe um preço maior que zero para calcular.");
    }
    if (results.structureUnitCostCents === null) {
      reasons.push("Informe uma rotina de trabalho válida para calcular.");
    }
    if (
      results.monthlySalesGoal === null &&
      results.unitContributionCents !== null &&
      results.unitContributionCents <= 0
    ) {
      reasons.push(
        "O valor deixado por venda precisa ser positivo para calcular uma quantidade necessária.",
      );
    }

    return {
      ...base,
      diagnosis: {
        verdict: results.verdict,
        priority: results.priority,
        partial: false,
      },
      facts,
      availability: {
        volume: "not_applicable",
        completeCostAvailable: results.unitCostCents !== null,
        monthlyResultAvailable: false,
        minimumPriceAvailable: results.minimumPriceCents !== null,
        requiredVolumeAvailable: results.monthlySalesGoal !== null,
        discountSimulationAvailable:
          results.unitCostCents !== null && results.minimumPriceCents !== null,
        reasons,
      },
    };
  }

  const directCost =
    snapshot.category === "product"
      ? snapshot.results.purchaseUnitCostCents
      : snapshot.results.productionUnitCostCents;
  const { results } = snapshot;
  const usesCurrentContent =
    snapshot.category === "product"
      ? snapshot.contentVersion === PRODUCT_CONTENT_VERSION
      : snapshot.contentVersion === PRODUCTION_CONTENT_VERSION;
  const scenario = usesCurrentContent
    ? deriveQuickBreakEvenScenario(results, snapshot.policy)
    : null;
  const facts: ReportAiFact[] = [
    moneyFact(
      "current_price",
      "Preço atual",
      results.currentPriceCents,
      "unit",
    ),
    moneyFact("variable_unit_cost", "Custo variável", directCost, "unit"),
    moneyFact(
      "fixed_allocation",
      "Parte dos gastos mensais por unidade",
      results.fixedAllocationCents,
      "unit",
    ),
    moneyFact(
      "total_unit_cost",
      "Custo completo",
      results.totalUnitCostCents,
      "unit",
    ),
    moneyFact(
      "unit_contribution",
      "Valor deixado por venda",
      results.unitContributionCents,
      "unit",
    ),
    moneyFact(
      "unit_profit",
      "Resultado por unidade",
      results.unitProfitCents,
      "unit",
    ),
    moneyFact(
      "fee_amount",
      "Impostos e cartão por unidade",
      results.feeAmountCents,
      "unit",
    ),
    moneyFact(
      "monthly_result",
      "Resultado do mês",
      results.monthlyResultCents,
      "month",
    ),
    percentageFact(
      "real_margin",
      "Quanto sobra a cada R$ 100",
      results.realMarginBasisPoints,
      "month",
    ),
    moneyFact(
      "minimum_price",
      "Menor preço sem prejuízo",
      results.minimumPriceCents,
      "unit",
    ),
    volumeFact(
      "required_monthly_volume",
      "Vendas necessárias no mês",
      results.monthlySalesGoal,
      "unidades",
    ),
    volumeFact(
      "required_weekly_volume",
      "Vendas necessárias por semana",
      results.weeklySalesGoal,
      "unidades",
    ),
    volumeFact(
      "required_daily_volume",
      "Vendas necessárias por dia",
      results.dailySalesGoal,
      "unidades",
    ),
    integerPercentageFact(
      "break_even_discount",
      "Limite de desconto sem prejuízo",
      results.breakEvenDiscountPercent,
      "unit",
    ),
    ...(scenario
      ? [
          volumeFact(
            "break_even_reference_volume",
            "Referência de equilíbrio no mês",
            scenario.referenceVolume,
            "unidades",
          ),
          moneyFact(
            "break_even_price",
            "Preço de equilíbrio",
            scenario.breakEvenPriceCents,
            "unit",
          ),
        ]
      : []),
  ];
  const reasons: string[] = [];
  if (results.monthlySalesVolumeUsed === null) {
    reasons.push(
      scenario
        ? "Sem a quantidade vendida, o relatório mostra o ponto de equilíbrio como referência, nunca como resultado do mês."
        : "Informe a quantidade vendida no mês para distribuir os gastos e completar o resultado.",
    );
  }
  if (results.monthlySalesGoal === null && results.unitContributionCents <= 0) {
    reasons.push(
      "O valor deixado por venda precisa ser positivo para calcular uma quantidade necessária.",
    );
  }

  return {
    ...base,
    diagnosis: {
      verdict: results.verdict,
      priority: results.priority,
      partial: results.monthlySalesVolumeUsed === null,
    },
    facts,
    availability: {
      volume: volumeState(results.monthlySalesVolumeUsed),
      completeCostAvailable: results.totalUnitCostCents !== null,
      monthlyResultAvailable: results.monthlyResultCents !== null,
      minimumPriceAvailable: results.minimumPriceCents !== null,
      requiredVolumeAvailable: results.monthlySalesGoal !== null,
      discountSimulationAvailable:
        results.totalUnitCostCents !== null &&
        results.minimumPriceCents !== null,
      reasons,
    },
  };
}

export { buildQuickReportAiContext };
