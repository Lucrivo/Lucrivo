import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "../formatters";
import {
  parseProductionReportSnapshot,
  type ProductionReportSnapshotV1,
} from "../schemas/production-report-snapshot.schema";
import {
  PRODUCTION_CALCULATION_VERSION,
  PRODUCTION_CONTENT_VERSION,
  PRODUCTION_REPORT_SCHEMA_VERSION,
  type ProductionReportCalculation,
  type ProductionReportVerdict,
  type ReportSection,
  type ReportTone,
} from "../types";
import { buildProductionExecutiveSummary } from "./build-production-executive-summary";

const productionVerdictContent: Record<
  ProductionReportVerdict,
  { label: string; body: string; tone: ReportTone }
> = {
  direct_loss: {
    label: "Prejuízo direto",
    body: "A receita líquida não cobre o custo de fabricação. Corrija custo ou preço antes de buscar volume.",
    tone: "critical",
  },
  incomplete_volume: {
    label: "Complete o diagnóstico",
    body: "A contribuição é positiva, mas falta o volume médio mensal para calcular a margem real e compará-la com a meta de 20%.",
    tone: "neutral",
  },
  operational_loss: {
    label: "Prejuízo operacional",
    body: "O preço cobre a fabricação, mas não todo o custo operacional da unidade.",
    tone: "critical",
  },
  tight_margin: {
    label: "Margem apertada",
    body: "A unidade gera lucro, mas a margem real ainda está abaixo da meta de 20%.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Margem adequada",
    body: "A margem real alcança a meta de 20%; mantenha o volume necessário.",
    tone: "positive",
  },
  above_target: {
    label: "Acima da meta",
    body: "A margem real supera a meta de 20%; valide o preço no mercado e mantenha o volume.",
    tone: "positive",
  },
};

function buildProductionBreakEvenSection(
  calculation: ProductionReportCalculation,
): ReportSection {
  const minimumPrice = calculation.minimumPriceCents;

  if (minimumPrice === null) {
    return {
      key: "break_even",
      title: "1 · Ponto de equilíbrio",
      body: "As taxas informadas não permitem calcular um preço mínimo seguro por unidade para cobrir o custo de fabricação.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "neutral",
    };
  }

  if (calculation.priceReferencesPartial) {
    return {
      key: "break_even",
      title: "1 · Ponto de equilíbrio",
      body: `O preço mínimo parcial de ${formatCurrency(minimumPrice)} por unidade cobre o custo de fabricação e as taxas, mas foi calculado sem rateio fixo.`,
      emphasisLabel: "Preço mínimo sem rateio fixo",
      emphasisValue: formatCurrency(minimumPrice),
      tone:
        calculation.currentPriceCents >= minimumPrice ? "positive" : "critical",
    };
  }

  return {
    key: "break_even",
    title: "1 · Ponto de equilíbrio",
    body: `O preço mínimo de ${formatCurrency(minimumPrice)} por unidade inclui o custo de fabricação, as taxas e o rateio dos custos fixos.`,
    emphasisLabel: "Preço mínimo",
    emphasisValue: formatCurrency(minimumPrice),
    tone:
      calculation.currentPriceCents >= minimumPrice ? "positive" : "critical",
  };
}

function buildProductionHiddenCostSection(
  command: ProductionDiagnosisCommand,
  calculation: ProductionReportCalculation,
): ReportSection {
  const compositionPremise = command.costCompositionEnabled
    ? "A mão de obra direta integra o custo de fabricação; o pró-labore integra os custos fixos e não deve ser contado novamente."
    : "O custo de fabricação foi informado de forma resumida, sem detalhamento dos componentes.";

  if (
    calculation.fixedAllocationCents === null ||
    calculation.totalUnitCostCents === null
  ) {
    return {
      key: "hidden_cost",
      title: "2 · O custo escondido da unidade",
      body: `${compositionPremise} Informe o volume médio mensal para ratear os custos fixos e o pró-labore. Sem esse dado, o custo de fabricação é conhecido, mas o custo total por unidade continua indisponível.`,
      emphasisLabel: "Custo de fabricação",
      emphasisValue: formatCurrency(calculation.productionUnitCostCents),
      tone: "neutral",
    };
  }

  return {
    key: "hidden_cost",
    title: "2 · O custo escondido da unidade",
    body: `${compositionPremise} Além do custo de fabricação, cada unidade recebe ${formatCurrency(calculation.fixedAllocationCents)} de custos fixos rateados. O custo total por unidade chega a ${formatCurrency(calculation.totalUnitCostCents)}.`,
    emphasisLabel: "Custo total por unidade",
    emphasisValue: formatCurrency(calculation.totalUnitCostCents),
    tone: "neutral",
  };
}

function buildProductionMarginSection(
  calculation: ProductionReportCalculation,
): ReportSection {
  const content = productionVerdictContent[calculation.verdict];

  return {
    key: "margin_diagnosis",
    title: "3 · Diagnóstico da margem",
    body: content.body,
    emphasisLabel:
      calculation.realMarginBasisPoints === null ? null : "Margem real",
    emphasisValue:
      calculation.realMarginBasisPoints === null
        ? content.label
        : formatBasisPoints(calculation.realMarginBasisPoints),
    tone: content.tone,
  };
}

function buildProductionSalesGoalSection(
  calculation: ProductionReportCalculation,
): ReportSection {
  if (calculation.unitContributionCents <= 0) {
    return {
      key: "sales_goal",
      title: "Meta de vendas",
      body: "Corrija o custo de fabricação ou o preço antes de buscar volume. Vender mais unidades nas condições atuais aumenta a perda, mesmo operando 6 dias por semana.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "critical",
    };
  }

  const monthly = calculation.monthlySalesGoal;
  const weekly = calculation.weeklySalesGoal;
  const daily = calculation.dailySalesGoal;

  if (monthly === null || weekly === null || daily === null) {
    return {
      key: "sales_goal",
      title: "Meta de vendas",
      body: "A meta de unidades fica disponível quando a contribuição por unidade forma uma referência válida, considerando 6 dias de operação por semana.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "neutral",
    };
  }

  return {
    key: "sales_goal",
    title: "Meta de vendas",
    body: `Com a contribuição por unidade atual, a referência é ${formatIntegerVolume(monthly)} unidades por mês, ${formatIntegerVolume(weekly)} por semana e ${formatIntegerVolume(daily)} por dia, considerando 6 dias de operação por semana.`,
    emphasisLabel: "Meta mensal",
    emphasisValue: `${formatIntegerVolume(monthly)} unidades`,
    tone: "positive",
  };
}

function buildProductionDiscountSection(
  calculation: ProductionReportCalculation,
): ReportSection {
  if (calculation.priceReferencesPartial) {
    return {
      key: "discount_simulator",
      title: "Quanto de desconto cabe na produção?",
      body: "A simulação parcial mostra contribuição por unidade e margem de contribuição sobre o custo de fabricação. Sem volume, ela não inclui o efeito dos custos fixos no resultado final.",
      emphasisLabel:
        calculation.breakEvenDiscountPercent === null
          ? null
          : "Limite parcial antes da perda direta",
      emphasisValue:
        calculation.breakEvenDiscountPercent === null
          ? null
          : `${calculation.breakEvenDiscountPercent}%`,
      tone: "neutral",
    };
  }

  return {
    key: "discount_simulator",
    title: "Quanto de desconto cabe na produção?",
    body: "A simulação completa mostra como cada desconto altera o lucro por unidade e a margem real, já considerando o rateio dos custos fixos.",
    emphasisLabel:
      calculation.breakEvenDiscountPercent === null
        ? null
        : "Limite antes do prejuízo",
    emphasisValue:
      calculation.breakEvenDiscountPercent === null
        ? null
        : `${calculation.breakEvenDiscountPercent}%`,
    tone: "neutral",
  };
}

function buildProductionReportSnapshot(
  command: ProductionDiagnosisCommand,
  calculation: ProductionReportCalculation,
): ProductionReportSnapshotV1 {
  const snapshot = {
    schemaVersion: PRODUCTION_REPORT_SCHEMA_VERSION,
    calculationVersion: PRODUCTION_CALCULATION_VERSION,
    contentVersion: PRODUCTION_CONTENT_VERSION,
    category: "production" as const,
    scenario: "manufacturing" as const,
    currency: "BRL" as const,
    unit: "unit" as const,
    policy: {
      targetMarginBasisPoints: 2000 as const,
      weeklyDivisorHundredths: 433 as const,
      operatingDaysPerWeek: 6 as const,
      maximumDiscountPercent: 50 as const,
      proLaboreIncluded: command.proLaboreIncluded,
    },
    inputs: {
      costCompositionEnabled: command.costCompositionEnabled,
      productionUnitCostCents: command.productionUnitCostCents,
      materialUnitCostCents: command.materialUnitCostCents,
      packagingUnitCostCents: command.packagingUnitCostCents,
      directLaborUnitCostCents: command.directLaborUnitCostCents,
      otherVariableUnitCostCents: command.otherVariableUnitCostCents,
      unitSalePriceCents: command.unitSalePriceCents,
      fixedMonthlyExpensesCents: command.fixedMonthlyExpensesCents,
      monthlySalesVolume: command.monthlySalesVolume,
      proLaboreIncluded: command.proLaboreIncluded,
      proLaboreCents: command.proLaboreCents,
      taxRateBasisPoints: command.taxRateBasisPoints,
      cardFeeRateBasisPoints: command.cardFeeRateBasisPoints,
    },
    results: {
      effectiveFixedCostCents: calculation.effectiveFixedCostCents,
      productionUnitCostCents: calculation.productionUnitCostCents,
      fixedAllocationCents: calculation.fixedAllocationCents,
      totalUnitCostCents: calculation.totalUnitCostCents,
      currentPriceCents: calculation.currentPriceCents,
      netRevenueCents: calculation.netRevenueCents,
      unitContributionCents: calculation.unitContributionCents,
      unitProfitCents: calculation.unitProfitCents,
      realMarginBasisPoints: calculation.realMarginBasisPoints,
      minimumPriceCents: calculation.minimumPriceCents,
      targetPriceCents: calculation.targetPriceCents,
      priceReferencesPartial: calculation.priceReferencesPartial,
      monthlySalesGoal: calculation.monthlySalesGoal,
      weeklySalesGoal: calculation.weeklySalesGoal,
      dailySalesGoal: calculation.dailySalesGoal,
      breakEvenDiscountPercent: calculation.breakEvenDiscountPercent,
      verdict: calculation.verdict,
      priority: calculation.priority,
    },
    executiveSummary: buildProductionExecutiveSummary(calculation),
    sections: [
      buildProductionBreakEvenSection(calculation),
      buildProductionHiddenCostSection(command, calculation),
      buildProductionMarginSection(calculation),
      buildProductionSalesGoalSection(calculation),
      buildProductionDiscountSection(calculation),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents:
        calculation.totalUnitCostCents ?? calculation.productionUnitCostCents,
      totalFeeBasisPoints: calculation.totalFeeBasisPoints,
      targetMarginBasisPoints: 2000 as const,
      minimumPriceCents: calculation.minimumPriceCents,
      partial: calculation.priceReferencesPartial,
    },
  };

  return parseProductionReportSnapshot(snapshot);
}

export { buildProductionReportSnapshot };
