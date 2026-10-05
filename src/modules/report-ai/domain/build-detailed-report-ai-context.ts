import { calculateDetailedSalesGoal } from "@/modules/reports/domain/calculate-detailed-sales-goal";
import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "@/modules/reports/formatters";
import { toDetailedReportViewModel } from "@/modules/reports/presenters/to-detailed-report-view-model";
import { isDetailedReportSnapshot } from "@/modules/reports/schemas/report-snapshot.schema";
import type { OwnedReport } from "@/modules/reports/services/get-report.service";

import type {
  ReportAiContextV2,
  ReportAiFact,
  ReportAiItemContext,
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

function buildDetailedReportAiContext(report: OwnedReport): ReportAiContextV2 {
  const snapshot = report.snapshot;
  if (!isDetailedReportSnapshot(snapshot)) {
    throw new Error("detailed_report_context_requires_detailed_snapshot");
  }

  const { results } = snapshot;
  const visible = toDetailedReportViewModel({
    id: report.id,
    createdAt: report.createdAt,
    snapshot,
  });
  const salesGoal = calculateDetailedSalesGoal(
    snapshot.inputs,
    results,
    snapshot.policy,
  );
  const businessFacts: ReportAiFact[] = [
    moneyFact(
      "effective_fixed_cost",
      "Gastos mensais considerados",
      results.effectiveFixedCostCents,
      "business",
    ),
    moneyFact(
      "monthly_revenue",
      "Faturamento do mês",
      results.monthlyGrossRevenueCents,
      "month",
    ),
    moneyFact(
      "monthly_variable_cost",
      "Custos variáveis do mês",
      results.monthlyVariableCostCents,
      "month",
    ),
    moneyFact(
      "monthly_contribution",
      "Valor deixado pelas vendas no mês",
      results.monthlyContributionCents,
      "month",
    ),
    moneyFact(
      "monthly_result",
      "Resultado do mês",
      results.monthlyResultCents,
      "month",
    ),
    percentageFact(
      "final_margin",
      "Quanto sobra a cada R$ 100",
      results.finalMarginBasisPoints,
      "month",
    ),
    moneyFact(
      "break_even_revenue",
      "Faturamento necessário para cobrir os gastos",
      results.breakEvenRevenueCents,
      "business",
    ),
    volumeFact(
      "required_monthly_volume",
      "Quantidade necessária no mês",
      salesGoal.available ? salesGoal.monthly : null,
      "unidades",
    ),
    volumeFact(
      "required_weekly_volume",
      "Quantidade necessária por semana",
      salesGoal.available ? salesGoal.weekly : null,
      "unidades",
    ),
    volumeFact(
      "required_daily_volume",
      "Quantidade necessária por dia",
      salesGoal.available ? salesGoal.daily : null,
      "unidades",
    ),
  ];

  const resultById = new Map(
    results.items.map((result) => [result.itemId, result]),
  );
  const items = snapshot.inputs.items.flatMap<ReportAiItemContext>(
    (input, index) => {
      const result = resultById.get(input.id);
      if (!result) return [];
      const technicalDetails = visible.items[index]?.technicalDetails ?? null;
      return [
        {
          name: input.name,
          directLoss: result.directLoss,
          facts: [
            moneyFact(
              "current_price",
              "Preço atual",
              input.unitSalePriceCents,
              "item",
            ),
            volumeFact(
              "monthly_volume",
              "Vendas informadas no mês",
              input.monthlySalesVolume,
              "unidades",
              "item",
            ),
            moneyFact(
              "variable_unit_cost",
              "Custo variável por unidade",
              result.variableUnitCostCents,
              "item",
            ),
            moneyFact(
              "fee_amount",
              "Impostos e cartão por unidade",
              result.feeAmountCents,
              "item",
            ),
            moneyFact(
              "unit_contribution",
              "Valor deixado por venda",
              result.unitContributionCents,
              "item",
            ),
            moneyFact(
              "monthly_contribution",
              "Valor deixado pelo item no mês",
              result.monthlyContributionCents,
              "item",
            ),
            moneyFact(
              "fixed_allocation",
              "Parte dos gastos mensais por unidade",
              result.fixedAllocationCents,
              "item",
            ),
            moneyFact(
              "total_unit_cost",
              "Custo completo por unidade",
              result.totalUnitCostCents,
              "item",
            ),
            moneyFact(
              "unit_profit",
              "Resultado por unidade",
              result.unitProfitCents,
              "item",
            ),
            percentageFact(
              "real_margin",
              "Quanto sobra a cada R$ 100",
              result.realMarginBasisPoints,
              "item",
            ),
            moneyFact(
              "minimum_price",
              "Menor preço sem prejuízo",
              result.breakEvenUnitPriceCents,
              "item",
            ),
          ],
          technicalDetails: technicalDetails
            ? {
                modeLabel: technicalDetails.modeLabel,
                ...(technicalDetails.yieldAndLossLabel
                  ? {
                      yieldAndLossLabel: technicalDetails.yieldAndLossLabel,
                    }
                  : {}),
                ingredients: technicalDetails.ingredients.map(
                  ({ id, ...ingredient }) => {
                    void id;
                    return ingredient;
                  },
                ),
                ...(technicalDetails.additionalCostsLabel
                  ? {
                      additionalCostsLabel:
                        technicalDetails.additionalCostsLabel,
                    }
                  : {}),
              }
            : null,
        },
      ];
    },
  );

  const knownVolumes = snapshot.inputs.items.map(
    ({ monthlySalesVolume }) => monthlySalesVolume,
  );
  const volume = knownVolumes.some((value) => value === null)
    ? "unknown"
    : knownVolumes.every((value) => value === 0)
      ? "known_zero"
      : "known_positive";
  const missingVolumeIds = new Set(results.missingVolumeItemIds);
  const reasons = snapshot.inputs.items
    .filter(({ id }) => missingVolumeIds.has(id))
    .map(
      ({ name }) =>
        `Informe as vendas mensais de ${name} para completar o resultado do conjunto.`,
    );
  if (!salesGoal.available && !reasons.includes(salesGoal.reason)) {
    reasons.push(salesGoal.reason);
  }

  return {
    schemaVersion: 2,
    report: {
      id: report.id,
      version: report.version,
      category: snapshot.category,
      scenario: snapshot.scenario,
      unit: "mix",
      analysisMode: "detailed",
    },
    diagnosis: {
      verdict: results.verdict,
      priority: results.priority,
      partial: results.isPartial,
    },
    facts: businessFacts,
    availability: {
      volume,
      completeCostAvailable: results.items.every(
        ({ totalUnitCostCents }) => totalUnitCostCents !== null,
      ),
      monthlyResultAvailable: results.monthlyResultCents !== null,
      minimumPriceAvailable: results.items.every(
        ({ breakEvenUnitPriceCents }) => breakEvenUnitPriceCents !== null,
      ),
      requiredVolumeAvailable: salesGoal.available,
      discountSimulationAvailable: results.items.some(
        ({ totalUnitCostCents, breakEvenUnitPriceCents }) =>
          totalUnitCostCents !== null && breakEvenUnitPriceCents !== null,
      ),
      reasons,
    },
    explanations: {
      executiveSummary: visible.executiveSummary,
      sections: visible.sections,
      guidance: visible.secondaryGuidance,
      comparison: visible.comparison.map(({ id, ...entry }) => {
        void id;
        return entry;
      }),
    },
    items,
  };
}

export { buildDetailedReportAiContext };
