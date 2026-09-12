import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "../formatters";
import {
  parseCurrentProductionReportSnapshot,
  type CurrentProductionReportSnapshot,
} from "../schemas/production-report-snapshot.schema";
import {
  PRODUCTION_CALCULATION_VERSION,
  PRODUCTION_CONTENT_VERSION,
  PRODUCTION_REPORT_SCHEMA_VERSION,
  type ProductionReportCalculation,
  type ReportSection,
} from "../types";
import { buildProductionExecutiveSummary } from "./build-production-executive-summary";

function minimumPriceSection(
  calculation: ProductionReportCalculation,
): ReportSection {
  const minimum = calculation.minimumPriceCents;
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
      body: "Este valor evita prejuízo direto na venda e considera o custo de fabricação. Os gastos mensais dependem da quantidade mostrada abaixo.",
      emphasisLabel: "Menor preço antes dos gastos mensais",
      emphasisValue: formatCurrency(minimum),
      tone: calculation.currentPriceCents >= minimum ? "positive" : "critical",
    };
  return {
    key: "break_even",
    title: "Seu menor preço sem prejuízo",
    body: "Este preço paga o custo de fabricação, as cobranças da venda e a parte dos gastos mensais por unidade.",
    emphasisLabel: "Menor preço sem prejuízo",
    emphasisValue: formatCurrency(minimum),
    tone: calculation.currentPriceCents >= minimum ? "positive" : "critical",
  };
}

function compositionText(command: ProductionDiagnosisCommand) {
  if (!command.costCompositionEnabled)
    return `O custo de fabricação informado é ${formatCurrency(command.productionUnitCostCents)} por unidade.`;
  return `O custo de fabricação reúne materiais (${formatCurrency(command.materialUnitCostCents ?? 0)}), embalagem (${formatCurrency(command.packagingUnitCostCents ?? 0)}), seu trabalho por unidade (${formatCurrency(command.directLaborUnitCostCents ?? 0)}) e outros gastos por unidade (${formatCurrency(command.otherVariableUnitCostCents ?? 0)}).`;
}

function saleSection(
  command: ProductionDiagnosisCommand,
  calculation: ProductionReportCalculation,
): ReportSection {
  const composition = compositionText(command);
  if (calculation.monthlySalesVolumeUsed === 0)
    return {
      key: "hidden_cost",
      title: "O que sai de cada venda",
      body: `${composition} Impostos e cartão retiram ${formatCurrency(calculation.feeAmountCents)}. Uma futura unidade vendida deixa ${formatCurrency(calculation.unitContributionCents)} para pagar os gastos mensais.`,
      emphasisLabel: "Valor deixado por uma unidade vendida",
      emphasisValue: formatCurrency(calculation.unitContributionCents),
      tone: calculation.unitContributionCents > 0 ? "neutral" : "critical",
    };
  return {
    key: "hidden_cost",
    title: "O que sai de cada venda",
    body: `${composition} Impostos e cartão retiram ${formatCurrency(calculation.feeAmountCents)}, e cada unidade vendida recebe ${formatCurrency(calculation.fixedAllocationCents ?? 0)} dos gastos mensais.`,
    emphasisLabel: "Resultado por unidade vendida",
    emphasisValue: formatCurrency(calculation.unitProfitCents ?? 0),
    tone: (calculation.unitProfitCents ?? 0) > 0 ? "positive" : "critical",
  };
}

function monthlySection(
  calculation: ProductionReportCalculation,
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
    body: `O resultado considera ${formatCurrency(calculation.monthlyNetRevenueCents)} recebidos pelas unidades vendidas depois de impostos e cartão, menos a fabricação e os gastos mensais. Quanto sobra a cada R$ 100: ${margin}.`,
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

function salesSection(calculation: ProductionReportCalculation): ReportSection {
  if (calculation.monthlySalesGoal === null)
    return {
      key: "sales_goal",
      title: "Quanto você precisa vender",
      body: "Cada unidade vendida precisa deixar um valor positivo antes que uma quantidade possa pagar os gastos mensais.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "critical",
    };
  return {
    key: "sales_goal",
    title: "Quanto você precisa vender",
    body: `Para pagar os gastos mensais, a referência é ${formatIntegerVolume(calculation.monthlySalesGoal)} unidades vendidas no mês, ${formatIntegerVolume(calculation.weeklySalesGoal ?? 0)} por semana e ${formatIntegerVolume(calculation.dailySalesGoal ?? 0)} por dia, considerando 6 dias por semana.`,
    emphasisLabel: "Unidades vendidas necessárias no mês",
    emphasisValue: `${formatIntegerVolume(calculation.monthlySalesGoal)} unidades`,
    tone: "neutral",
  };
}

function discountSection(
  calculation: ProductionReportCalculation,
): ReportSection {
  return {
    key: "discount_simulator",
    title: "Como um desconto muda o resultado",
    body: calculation.priceReferencesPartial
      ? "Esta simulação ainda não inclui os gastos mensais, porque nenhuma venda foi informada."
      : "Veja como o desconto altera o valor deixado por unidade vendida e o resultado esperado.",
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

function buildProductionReportSnapshot(
  command: ProductionDiagnosisCommand,
  calculation: ProductionReportCalculation,
): CurrentProductionReportSnapshot {
  const snapshot = {
    schemaVersion: PRODUCTION_REPORT_SCHEMA_VERSION,
    calculationVersion: PRODUCTION_CALCULATION_VERSION,
    contentVersion: PRODUCTION_CONTENT_VERSION,
    category: "production" as const,
    scenario: "manufacturing" as const,
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
    results: { ...calculation },
    executiveSummary: buildProductionExecutiveSummary(calculation),
    sections: [
      minimumPriceSection(calculation),
      saleSection(command, calculation),
      monthlySection(calculation),
      salesSection(calculation),
      discountSection(calculation),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents:
        calculation.totalUnitCostCents ?? calculation.productionUnitCostCents,
      totalFeeBasisPoints: calculation.totalFeeBasisPoints,
      attentionBandBasisPoints: 2000 as const,
      minimumPriceCents: calculation.minimumPriceCents,
      partial: calculation.priceReferencesPartial,
    },
  };
  return parseCurrentProductionReportSnapshot(snapshot);
}

export { buildProductionReportSnapshot };
