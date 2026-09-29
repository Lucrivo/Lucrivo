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
import { calculateBreakEvenRevenue } from "./unit-economics";

function minimumPriceSection(
  calculation: ProductionReportCalculation,
): ReportSection {
  if (calculation.minimumPriceCents === null) {
    return {
      key: "break_even",
      title: "Menor preço para não ficar no prejuízo",
      body:
        calculation.monthlySalesVolumeUsed === null ||
        calculation.monthlySalesVolumeUsed === 0
          ? "Para calcular o custo completo e o menor preço, precisamos de uma quantidade maior que zero para dividir os gastos do mês."
          : "As cobranças informadas não permitem calcular este valor.",
      emphasisLabel: "Menor preço completo",
      emphasisValue: "Ainda não calculado",
      tone: "neutral",
    };
  }
  return {
    key: "break_even",
    title: "Menor preço para não ficar no prejuízo",
    body: `Considerando as ${formatIntegerVolume(calculation.monthlySalesVolumeUsed ?? 0)} unidades informadas, cada unidade recebe ${formatCurrency(calculation.fixedAllocationCents ?? 0)} dos gastos do mês.`,
    emphasisLabel: "Menor preço para não ficar no prejuízo",
    emphasisValue: formatCurrency(calculation.minimumPriceCents),
    tone:
      calculation.currentPriceCents >= calculation.minimumPriceCents
        ? "positive"
        : "critical",
  };
}

function compositionText(command: ProductionDiagnosisCommand): string {
  if (!command.costCompositionEnabled)
    return `Quanto esta unidade custa: ${formatCurrency(command.productionUnitCostCents)}.`;
  return `Quanto esta unidade custa: ${formatCurrency(command.productionUnitCostCents)}, somando materiais (${formatCurrency(command.materialUnitCostCents ?? 0)}), embalagem (${formatCurrency(command.packagingUnitCostCents ?? 0)}), trabalho por unidade (${formatCurrency(command.directLaborUnitCostCents ?? 0)}) e outros valores (${formatCurrency(command.otherVariableUnitCostCents ?? 0)}).`;
}

function saleSection(
  command: ProductionDiagnosisCommand,
  calculation: ProductionReportCalculation,
): ReportSection {
  const composition = compositionText(command);
  if (calculation.totalUnitCostCents === null) {
    return {
      key: "hidden_cost",
      title: "O que cada venda deixa para o mês",
      body: `${composition} Impostos e cartão retiram ${formatCurrency(calculation.feeAmountCents)}.`,
      emphasisLabel: "Valor deixado por venda",
      emphasisValue: formatCurrency(calculation.unitContributionCents),
      tone: calculation.unitContributionCents > 0 ? "neutral" : "critical",
    };
  }
  return {
    key: "hidden_cost",
    title: "Custo e resultado por unidade",
    body: `${composition} Parte dos gastos do mês: ${formatCurrency(calculation.fixedAllocationCents ?? 0)}. Custo completo por unidade: ${formatCurrency(calculation.totalUnitCostCents)}. Valor deixado por venda: ${formatCurrency(calculation.unitContributionCents)}.`,
    emphasisLabel: "Resultado por venda",
    emphasisValue: formatCurrency(calculation.unitProfitCents ?? 0),
    tone: (calculation.unitProfitCents ?? 0) >= 0 ? "positive" : "critical",
  };
}

function monthlySection(
  calculation: ProductionReportCalculation,
): ReportSection {
  if (calculation.monthlyResultCents === null) {
    return {
      key: "margin_diagnosis",
      title: "Quanto sobra no mês",
      body: "O cálculo depende da quantidade vendida no mês. Informe esse valor para ver quanto sobra depois dos custos e gastos considerados.",
      emphasisLabel: "Valor no mês",
      emphasisValue: "Ainda não calculado",
      tone: "neutral",
    };
  }
  const margin =
    calculation.realMarginBasisPoints === null
      ? "Ainda não calculado"
      : formatBasisPoints(calculation.realMarginBasisPoints);
  return {
    key: "margin_diagnosis",
    title: "Quanto sobra no mês",
    body: `O cálculo considera ${formatCurrency(calculation.monthlyNetRevenueCents ?? 0)} recebidos depois de impostos e cartão, menos os custos de fabricação e os gastos mensais. Quanto sobra a cada R$ 100: ${margin}.`,
    emphasisLabel:
      calculation.monthlyResultCents > 0
        ? "Lucro no mês"
        : calculation.monthlyResultCents < 0
          ? "Prejuízo no mês"
          : "Sem lucro nem prejuízo",
    emphasisValue: formatCurrency(calculation.monthlyResultCents),
    tone:
      calculation.monthlyResultCents > 0
        ? "positive"
        : calculation.monthlyResultCents < 0
          ? "critical"
          : "neutral",
  };
}

function salesSection(
  command: ProductionDiagnosisCommand,
  calculation: ProductionReportCalculation,
): ReportSection {
  const breakEvenRevenueCents = calculateBreakEvenRevenue(
    calculation.effectiveFixedCostCents,
    calculation.currentPriceCents,
    calculation.unitContributionCents,
  );
  if (breakEvenRevenueCents === null) {
    return {
      key: "sales_goal",
      title: "Quanto você precisa vender",
      body: "No preço atual, cada unidade vendida ainda não deixa um valor positivo para pagar os gastos do mês. Revise o preço ou os custos antes de definir uma meta de faturamento.",
      emphasisLabel: "Faturamento necessário no mês",
      emphasisValue: "Ainda não calculado",
      tone: "critical",
    };
  }
  const withdrawal = command.proLaboreIncluded
    ? " e o valor informado para você"
    : "";
  return {
    key: "sales_goal",
    title: "Quanto você precisa vender",
    body: `No preço atual, esta é a referência de faturamento mensal necessária para que o valor deixado pelas vendas pague os gastos mensais${withdrawal}.`,
    emphasisLabel: "Faturamento necessário no mês",
    emphasisValue: formatCurrency(breakEvenRevenueCents),
    tone: "neutral",
  };
}

function discountSection(
  calculation: ProductionReportCalculation,
): ReportSection {
  const available = calculation.minimumPriceCents !== null;
  return {
    key: "discount_simulator",
    title: "Como um desconto muda o resultado",
    body: available
      ? "Veja como o desconto muda o resultado por venda."
      : "Para calcular um desconto seguro, primeiro precisamos de uma quantidade para dividir os gastos do mês.",
    emphasisLabel: available ? "Limite antes do prejuízo" : "Simulação",
    emphasisValue:
      calculation.breakEvenDiscountPercent === null
        ? "Ainda não calculado"
        : `${calculation.breakEvenDiscountPercent}%`,
    tone: "neutral",
  };
}

function buildProductionReportSnapshot(
  command: ProductionDiagnosisCommand,
  calculation: ProductionReportCalculation,
): CurrentProductionReportSnapshot {
  return parseCurrentProductionReportSnapshot({
    schemaVersion: PRODUCTION_REPORT_SCHEMA_VERSION,
    calculationVersion: PRODUCTION_CALCULATION_VERSION,
    contentVersion: PRODUCTION_CONTENT_VERSION,
    category: "production",
    scenario: "manufacturing",
    currency: "BRL",
    unit: "unit",
    policy: {
      weeklyDivisorHundredths: 433,
      operatingDaysPerWeek: 6,
      maximumDiscountPercent: 50,
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
      salesSection(command, calculation),
      discountSection(calculation),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents: calculation.totalUnitCostCents,
      totalFeeBasisPoints: calculation.totalFeeBasisPoints,
      minimumPriceCents: calculation.minimumPriceCents,
    },
  });
}

export { buildProductionReportSnapshot };
