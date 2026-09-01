import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "../formatters";
import {
  parseProductReportSnapshot,
  type ProductReportSnapshotV1,
} from "../schemas/product-report-snapshot.schema";
import {
  PRODUCT_CALCULATION_VERSION,
  PRODUCT_CONTENT_VERSION,
  PRODUCT_REPORT_SCHEMA_VERSION,
  type ProductReportCalculation,
  type ProductReportVerdict,
  type ReportSection,
  type ReportTone,
} from "../types";
import { buildProductExecutiveSummary } from "./build-product-executive-summary";

const productVerdictContent: Record<
  ProductReportVerdict,
  { label: string; body: string; tone: ReportTone }
> = {
  direct_loss: {
    label: "Prejuízo direto",
    body: "A receita líquida não cobre o custo de compra. Corrija custo ou preço antes de buscar volume.",
    tone: "critical",
  },
  incomplete_volume: {
    label: "Complete o diagnóstico",
    body: "A contribuição é positiva, mas falta o volume médio mensal para calcular a margem real e compará-la com a meta de 20%.",
    tone: "neutral",
  },
  operational_loss: {
    label: "Prejuízo operacional",
    body: "O preço cobre a compra, mas não todo o custo operacional da unidade.",
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

function buildProductBreakEvenSection(
  calculation: ProductReportCalculation,
): ReportSection {
  const minimumPrice = calculation.minimumPriceCents;

  if (minimumPrice === null) {
    return {
      key: "break_even",
      title: "1 · Ponto de equilíbrio",
      body: "As taxas informadas não permitem calcular um preço mínimo seguro por unidade para cobrir o custo de compra.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "neutral",
    };
  }

  if (calculation.priceReferencesPartial) {
    return {
      key: "break_even",
      title: "1 · Ponto de equilíbrio",
      body: `O preço mínimo parcial de ${formatCurrency(minimumPrice)} por unidade cobre o custo de compra e as taxas, mas foi calculado sem rateio fixo.`,
      emphasisLabel: "Preço mínimo sem rateio fixo",
      emphasisValue: formatCurrency(minimumPrice),
      tone:
        calculation.currentPriceCents >= minimumPrice
          ? "positive"
          : "critical",
    };
  }

  return {
    key: "break_even",
    title: "1 · Ponto de equilíbrio",
    body: `O preço mínimo de ${formatCurrency(minimumPrice)} por unidade inclui o custo de compra, as taxas e o rateio dos custos fixos.`,
    emphasisLabel: "Preço mínimo",
    emphasisValue: formatCurrency(minimumPrice),
    tone:
      calculation.currentPriceCents >= minimumPrice ? "positive" : "critical",
  };
}

function buildProductHiddenCostSection(
  calculation: ProductReportCalculation,
): ReportSection {
  if (
    calculation.fixedAllocationCents === null ||
    calculation.totalUnitCostCents === null
  ) {
    return {
      key: "hidden_cost",
      title: "2 · O custo escondido da unidade",
      body: "Informe o volume médio mensal para ratear os custos fixos e o pró-labore. Sem esse dado, o custo de compra é conhecido, mas o custo total por unidade continua indisponível.",
      emphasisLabel: "Custo de compra",
      emphasisValue: formatCurrency(calculation.purchaseUnitCostCents),
      tone: "neutral",
    };
  }

  return {
    key: "hidden_cost",
    title: "2 · O custo escondido da unidade",
    body: `Além do custo de compra, cada unidade recebe ${formatCurrency(calculation.fixedAllocationCents)} de custos fixos rateados. O custo total por unidade chega a ${formatCurrency(calculation.totalUnitCostCents)}.`,
    emphasisLabel: "Custo total por unidade",
    emphasisValue: formatCurrency(calculation.totalUnitCostCents),
    tone: "neutral",
  };
}

function buildProductMarginSection(
  calculation: ProductReportCalculation,
): ReportSection {
  const content = productVerdictContent[calculation.verdict];

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

function buildProductSalesGoalSection(
  calculation: ProductReportCalculation,
): ReportSection {
  if (calculation.unitContributionCents <= 0) {
    return {
      key: "sales_goal",
      title: "Meta de vendas",
      body: "Corrija o custo de compra ou o preço antes de buscar volume. Vender mais unidades nas condições atuais aumenta a perda, mesmo operando 6 dias por semana.",
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

function buildProductDiscountSection(
  calculation: ProductReportCalculation,
): ReportSection {
  if (calculation.priceReferencesPartial) {
    return {
      key: "discount_simulator",
      title: "Quanto de desconto cabe no produto?",
      body: "A simulação parcial mostra contribuição por unidade e margem de contribuição sobre o custo de compra. Sem volume, ela não inclui o efeito dos custos fixos no resultado final.",
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
    title: "Quanto de desconto cabe no produto?",
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

function buildProductReportSnapshot(
  command: ProductDiagnosisCommand,
  calculation: ProductReportCalculation,
): ProductReportSnapshotV1 {
  const snapshot = {
    schemaVersion: PRODUCT_REPORT_SCHEMA_VERSION,
    calculationVersion: PRODUCT_CALCULATION_VERSION,
    contentVersion: PRODUCT_CONTENT_VERSION,
    category: "product" as const,
    scenario: "resale" as const,
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
      purchaseUnitCostCents: command.purchaseUnitCostCents,
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
      purchaseUnitCostCents: calculation.purchaseUnitCostCents,
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
    executiveSummary: buildProductExecutiveSummary(calculation),
    sections: [
      buildProductBreakEvenSection(calculation),
      buildProductHiddenCostSection(calculation),
      buildProductMarginSection(calculation),
      buildProductSalesGoalSection(calculation),
      buildProductDiscountSection(calculation),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents:
        calculation.totalUnitCostCents ?? calculation.purchaseUnitCostCents,
      totalFeeBasisPoints: calculation.totalFeeBasisPoints,
      targetMarginBasisPoints: 2000 as const,
      minimumPriceCents: calculation.minimumPriceCents,
      partial: calculation.priceReferencesPartial,
    },
  };

  return parseProductReportSnapshot(snapshot);
}

export { buildProductReportSnapshot };
