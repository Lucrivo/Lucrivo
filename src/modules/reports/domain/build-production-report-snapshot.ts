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
    emphasisLabel: "Quanto sobra por venda",
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
      title: "Resultado do mês",
      body: "O resultado do mês depende de uma quantidade informada.",
      emphasisLabel: "Quanto sobra a cada R$ 100",
      emphasisValue: "Ainda não calculado",
      tone: "neutral",
    };
  }
  return {
    key: "margin_diagnosis",
    title: "Resultado do mês",
    body: `Quanto sobra a cada R$ 100: ${calculation.realMarginBasisPoints === null ? "Ainda não calculado" : formatBasisPoints(calculation.realMarginBasisPoints)}.`,
    emphasisLabel:
      calculation.verdict === "positive_result"
        ? "Resultado positivo"
        : calculation.verdict === "break_even"
          ? "Ponto de equilíbrio"
          : "Resultado do mês",
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
  if (calculation.monthlySalesGoal === null) {
    return {
      key: "sales_goal",
      title: "Quantas vendas pagam o mês",
      body: "No preço atual, uma nova venda ainda não deixa valor para pagar os gastos do mês.",
      emphasisLabel: "Quantidade necessária",
      emphasisValue: "Ainda não calculado",
      tone: "critical",
    };
  }
  const withdrawal = command.proLaboreIncluded
    ? " e separar o valor informado para você"
    : "";
  const unknown = calculation.monthlySalesVolumeUsed === null;
  return {
    key: "sales_goal",
    title: "Quantas vendas pagam o mês",
    body: unknown
      ? `Como você ainda não informou quantas vendas faz, não dividimos os gastos do mês por uma quantidade estimada. No preço atual, você precisa de cerca de ${formatIntegerVolume(calculation.monthlySalesGoal)} vendas para pagar esses gastos${withdrawal}.`
      : `No preço atual, cerca de ${formatIntegerVolume(calculation.monthlySalesGoal)} vendas pagam os gastos do mês${withdrawal}.`,
    emphasisLabel: "Vendas necessárias no mês",
    emphasisValue: `${formatIntegerVolume(calculation.monthlySalesGoal)} vendas`,
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
      ? "Veja como o desconto muda quanto sobra por venda."
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
