import type {
  ProductDiagnosisCommand,
  ProductKind,
} from "@/modules/quick-diagnosis/types";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "../formatters";
import {
  parseCurrentProductReportSnapshot,
  type CurrentProductReportSnapshot,
} from "../schemas/product-report-snapshot.schema";
import {
  PRODUCT_CALCULATION_VERSION,
  PRODUCT_CONTENT_VERSION,
  PRODUCT_REPORT_SCHEMA_VERSION,
  type ProductReportCalculation,
  type ReportSection,
} from "../types";
import { buildProductExecutiveSummary } from "./build-product-executive-summary";

function directCostName(kind: ProductKind) {
  return kind === "digital" ? "custo por venda" : "custo de compra";
}

function buildMinimumPriceSection(
  calculation: ProductReportCalculation,
  kind: ProductKind,
): ReportSection {
  const minimum = calculation.minimumPriceCents;
  const name = directCostName(kind);
  if (minimum === null)
    return {
      key: "break_even",
      title: "Seu menor preço sem prejuízo",
      body: "As porcentagens informadas não permitem calcular este valor.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "neutral",
    };
  if (calculation.priceReferencesPartial)
    return {
      key: "break_even",
      title: "Seu menor preço sem prejuízo",
      body: `Este valor evita prejuízo direto na venda e considera o ${name}. Os gastos mensais dependem da quantidade mostrada abaixo.`,
      emphasisLabel: "Menor preço antes dos gastos mensais",
      emphasisValue: formatCurrency(minimum),
      tone: calculation.currentPriceCents >= minimum ? "positive" : "critical",
    };
  return {
    key: "break_even",
    title: "Seu menor preço sem prejuízo",
    body: `Este preço paga o ${name}, as cobranças da venda e a parte dos gastos mensais por unidade.`,
    emphasisLabel: "Menor preço sem prejuízo",
    emphasisValue: formatCurrency(minimum),
    tone: calculation.currentPriceCents >= minimum ? "positive" : "critical",
  };
}

function buildSaleSection(
  calculation: ProductReportCalculation,
  kind: ProductKind,
): ReportSection {
  const name = directCostName(kind);
  if (calculation.monthlySalesVolumeUsed === 0)
    return {
      key: "hidden_cost",
      title: "O que sai de cada venda",
      body: `Do preço saem ${formatCurrency(calculation.feeAmountCents)} em impostos e cartão e ${formatCurrency(calculation.purchaseUnitCostCents)} de ${name}. Uma futura venda deixa ${formatCurrency(calculation.unitContributionCents)} para pagar os gastos mensais.`,
      emphasisLabel: "Valor deixado por uma venda",
      emphasisValue: formatCurrency(calculation.unitContributionCents),
      tone: calculation.unitContributionCents > 0 ? "neutral" : "critical",
    };
  return {
    key: "hidden_cost",
    title: "O que sai de cada venda",
    body: `Do preço saem ${formatCurrency(calculation.feeAmountCents)} em impostos e cartão, ${formatCurrency(calculation.purchaseUnitCostCents)} de ${name} e ${formatCurrency(calculation.fixedAllocationCents ?? 0)} dos gastos mensais.`,
    emphasisLabel: "Resultado por unidade",
    emphasisValue: formatCurrency(calculation.unitProfitCents ?? 0),
    tone: (calculation.unitProfitCents ?? 0) > 0 ? "positive" : "critical",
  };
}

function buildMonthlySection(
  calculation: ProductReportCalculation,
): ReportSection {
  const label = {
    direct_loss: "Prejuízo por venda",
    operational_loss: "Prejuízo no mês",
    no_sales: "Sem vendas no mês",
    break_even: "No limite",
    tight_margin: "Margem apertada",
    adequate_margin: "Lucro",
    incomplete_volume: "Sem vendas no mês",
    above_target: "Lucro",
  }[calculation.verdict];
  const margin =
    calculation.realMarginBasisPoints === null
      ? "Sem vendas para calcular"
      : formatBasisPoints(calculation.realMarginBasisPoints);
  return {
    key: "margin_diagnosis",
    title: "Quanto sobra no mês",
    body: `O resultado considera ${formatCurrency(calculation.monthlyNetRevenueCents)} recebidos depois de impostos e cartão, menos os custos das vendas e os gastos mensais. Quanto sobra a cada R$ 100: ${margin}.`,
    emphasisLabel: label,
    emphasisValue: formatCurrency(calculation.monthlyResultCents),
    tone:
      calculation.monthlyResultCents > 0
        ? calculation.verdict === "tight_margin"
          ? "warning"
          : "positive"
        : calculation.monthlyResultCents < 0
          ? "critical"
          : "neutral",
  };
}

function buildSalesSection(
  calculation: ProductReportCalculation,
): ReportSection {
  if (calculation.monthlySalesGoal === null)
    return {
      key: "sales_goal",
      title: "Quanto você precisa vender",
      body: "Cada venda precisa deixar um valor positivo antes que uma quantidade possa pagar os gastos mensais.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "critical",
    };
  return {
    key: "sales_goal",
    title: "Quanto você precisa vender",
    body: `Para pagar os gastos mensais, a referência é ${formatIntegerVolume(calculation.monthlySalesGoal)} vendas no mês, ${formatIntegerVolume(calculation.weeklySalesGoal ?? 0)} por semana e ${formatIntegerVolume(calculation.dailySalesGoal ?? 0)} por dia, considerando 6 dias por semana.`,
    emphasisLabel: "Vendas necessárias no mês",
    emphasisValue: `${formatIntegerVolume(calculation.monthlySalesGoal)} unidades`,
    tone: "neutral",
  };
}

function buildDiscountSection(
  calculation: ProductReportCalculation,
): ReportSection {
  return {
    key: "discount_simulator",
    title: "Como um desconto muda o resultado",
    body: calculation.priceReferencesPartial
      ? "Esta simulação ainda não inclui os gastos mensais, porque nenhuma venda foi informada."
      : "Veja como o desconto altera o valor deixado por unidade e o resultado esperado.",
    emphasisLabel:
      calculation.breakEvenDiscountPercent === null
        ? null
        : "Desconto matemático antes da perda",
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
): CurrentProductReportSnapshot {
  const snapshot = {
    schemaVersion: PRODUCT_REPORT_SCHEMA_VERSION,
    calculationVersion: PRODUCT_CALCULATION_VERSION,
    contentVersion: PRODUCT_CONTENT_VERSION,
    category: "product" as const,
    scenario: command.productKind,
    currency: "BRL" as const,
    unit: "unit" as const,
    policy: {
      attentionBandBasisPoints: 2000 as const,
      weeklyDivisorHundredths: 433 as const,
      operatingDaysPerWeek: 6 as const,
      maximumDiscountPercent: 50 as const,
      proLaboreIncluded: command.proLaboreIncluded,
    },
    inputs: {
      productKind: command.productKind,
      purchaseUnitCostCents: command.purchaseUnitCostCents,
      unitSalePriceCents: command.unitSalePriceCents,
      fixedMonthlyExpensesCents: command.fixedMonthlyExpensesCents,
      monthlySalesVolume: command.monthlySalesVolume,
      proLaboreIncluded: command.proLaboreIncluded,
      proLaboreCents: command.proLaboreCents,
      taxRateBasisPoints: command.taxRateBasisPoints,
      cardFeeRateBasisPoints: command.cardFeeRateBasisPoints,
    },
    results: { ...calculation },
    executiveSummary: buildProductExecutiveSummary(
      calculation,
      command.productKind,
    ),
    sections: [
      buildMinimumPriceSection(calculation, command.productKind),
      buildSaleSection(calculation, command.productKind),
      buildMonthlySection(calculation),
      buildSalesSection(calculation),
      buildDiscountSection(calculation),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents:
        calculation.totalUnitCostCents ?? calculation.purchaseUnitCostCents,
      totalFeeBasisPoints: calculation.totalFeeBasisPoints,
      attentionBandBasisPoints: 2000 as const,
      minimumPriceCents: calculation.minimumPriceCents,
      partial: calculation.priceReferencesPartial,
    },
  };
  return parseCurrentProductReportSnapshot(snapshot);
}

export { buildProductReportSnapshot };
