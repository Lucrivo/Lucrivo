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
import {
  deriveQuickBreakEvenScenario,
  type BreakEvenScenario,
} from "./break-even-scenario";
import {
  scenarioDiscountBody,
  scenarioMinimumPriceBody,
  scenarioMonthlyBody,
  scenarioSalesGoalBody,
} from "./break-even-scenario-copy";
import { buildProductExecutiveSummary } from "./build-product-executive-summary";
import { calculateBreakEvenRevenue } from "./unit-economics";

function directCostName(kind: ProductKind) {
  return kind === "digital" ? "custo por venda" : "custo de compra";
}

function minimumPriceSection(
  calculation: ProductReportCalculation,
  scenario: BreakEvenScenario | null,
): ReportSection {
  if (scenario?.breakEvenPriceCents != null) {
    return {
      key: "break_even",
      title: "Menor preço para não ficar no prejuízo",
      body: scenarioMinimumPriceBody(scenario, "vendas"),
      emphasisLabel: "Preço de equilíbrio",
      emphasisValue: formatCurrency(scenario.breakEvenPriceCents),
      tone: "neutral",
    };
  }
  if (calculation.minimumPriceCents === null) {
    return {
      key: "break_even",
      title: "Menor preço para não ficar no prejuízo",
      body:
        calculation.monthlySalesVolumeUsed === null
          ? "No preço atual, cada venda perde dinheiro antes dos gastos do mês. Não existe quantidade que leve ao equilíbrio: revise o preço ou o custo."
          : calculation.monthlySalesVolumeUsed === 0
            ? "Para calcular o custo completo e o menor preço, precisamos de uma quantidade maior que zero para dividir os gastos do mês."
            : "As cobranças informadas não permitem calcular este valor.",
      emphasisLabel: "Menor preço completo",
      emphasisValue: "Ainda não calculado",
      tone:
        calculation.monthlySalesVolumeUsed === null ? "critical" : "neutral",
    };
  }
  return {
    key: "break_even",
    title: "Menor preço para não ficar no prejuízo",
    body: `Considerando as ${formatIntegerVolume(calculation.monthlySalesVolumeUsed ?? 0)} vendas informadas, cada unidade recebe ${formatCurrency(calculation.fixedAllocationCents ?? 0)} dos gastos do mês.`,
    emphasisLabel: "Menor preço para não ficar no prejuízo",
    emphasisValue: formatCurrency(calculation.minimumPriceCents),
    tone:
      calculation.currentPriceCents >= calculation.minimumPriceCents
        ? "positive"
        : "critical",
  };
}

function saleSection(
  calculation: ProductReportCalculation,
  kind: ProductKind,
): ReportSection {
  const name = directCostName(kind);
  if (calculation.totalUnitCostCents === null) {
    return {
      key: "hidden_cost",
      title: "O que cada venda deixa para o mês",
      body: `Do preço saem ${formatCurrency(calculation.feeAmountCents)} em impostos e cartão e ${formatCurrency(calculation.purchaseUnitCostCents)} de ${name}.`,
      emphasisLabel: "Valor deixado por venda",
      emphasisValue: formatCurrency(calculation.unitContributionCents),
      tone: calculation.unitContributionCents > 0 ? "neutral" : "critical",
    };
  }
  return {
    key: "hidden_cost",
    title: "Custo e resultado por unidade",
    body: `Quanto esta unidade custa: ${formatCurrency(calculation.purchaseUnitCostCents)}. Parte dos gastos do mês: ${formatCurrency(calculation.fixedAllocationCents ?? 0)}. Custo completo por unidade: ${formatCurrency(calculation.totalUnitCostCents)}. Valor deixado por venda: ${formatCurrency(calculation.unitContributionCents)}.`,
    emphasisLabel: "Resultado por venda",
    emphasisValue: formatCurrency(calculation.unitProfitCents ?? 0),
    tone: (calculation.unitProfitCents ?? 0) >= 0 ? "positive" : "critical",
  };
}

function monthlySection(
  calculation: ProductReportCalculation,
  scenario: BreakEvenScenario | null,
): ReportSection {
  if (scenario) {
    return {
      key: "margin_diagnosis",
      title: "Quanto sobra no mês",
      body: scenarioMonthlyBody(
        scenario,
        calculation.unitContributionCents,
        "vendas",
      ),
      emphasisLabel: "No ponto de equilíbrio",
      emphasisValue: formatCurrency(0),
      tone: "neutral",
    };
  }
  if (calculation.monthlyResultCents === null) {
    return {
      key: "margin_diagnosis",
      title: "Quanto sobra no mês",
      body:
        calculation.unitContributionCents <= 0
          ? `Cada venda perde ${formatCurrency(Math.abs(calculation.unitContributionCents))} antes dos gastos do mês, então o resultado fica negativo em qualquer quantidade.`
          : "O cálculo depende da quantidade vendida no mês. Informe esse valor para ver quanto sobra depois dos custos e gastos considerados.",
      emphasisLabel: "Valor no mês",
      emphasisValue: "Ainda não calculado",
      tone: calculation.unitContributionCents <= 0 ? "critical" : "neutral",
    };
  }
  const margin =
    calculation.realMarginBasisPoints === null
      ? "Ainda não calculado"
      : formatBasisPoints(calculation.realMarginBasisPoints);
  return {
    key: "margin_diagnosis",
    title: "Quanto sobra no mês",
    body: `O cálculo considera ${formatCurrency(calculation.monthlyNetRevenueCents ?? 0)} recebidos depois de impostos e cartão, menos os custos das vendas e os gastos mensais. Quanto sobra a cada R$ 100: ${margin}.`,
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
  command: ProductDiagnosisCommand,
  calculation: ProductReportCalculation,
  scenario: BreakEvenScenario | null,
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
      body: "No preço atual, cada venda ainda não deixa um valor positivo para pagar os gastos do mês. Revise o preço ou os custos antes de definir uma meta de faturamento.",
      emphasisLabel: "Faturamento necessário no mês",
      emphasisValue: "Ainda não calculado",
      tone: "critical",
    };
  }
  if (scenario) {
    return {
      key: "sales_goal",
      title: "Quanto você precisa vender",
      body: scenarioSalesGoalBody(scenario, "vendas"),
      emphasisLabel: "Faturamento necessário no mês",
      emphasisValue: formatCurrency(breakEvenRevenueCents),
      tone: "neutral",
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
  calculation: ProductReportCalculation,
  scenario: BreakEvenScenario | null,
): ReportSection {
  if (scenario?.breakEvenDiscountPercent != null) {
    return {
      key: "discount_simulator",
      title: "Como um desconto muda o resultado",
      body: scenarioDiscountBody(scenario, "vendas"),
      emphasisLabel: "Limite antes do prejuízo",
      emphasisValue: `${scenario.breakEvenDiscountPercent}%`,
      tone: "neutral",
    };
  }
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

function buildProductReportSnapshot(
  command: ProductDiagnosisCommand,
  calculation: ProductReportCalculation,
): CurrentProductReportSnapshot {
  const scenario = deriveQuickBreakEvenScenario(calculation);
  return parseCurrentProductReportSnapshot({
    schemaVersion: PRODUCT_REPORT_SCHEMA_VERSION,
    calculationVersion: PRODUCT_CALCULATION_VERSION,
    contentVersion: PRODUCT_CONTENT_VERSION,
    category: "product",
    scenario: command.productKind,
    currency: "BRL",
    unit: "unit",
    policy: {
      weeklyDivisorHundredths: 433,
      operatingDaysPerWeek: 6,
      maximumDiscountPercent: 50,
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
      minimumPriceSection(calculation, scenario),
      saleSection(calculation, command.productKind),
      monthlySection(calculation, scenario),
      salesSection(command, calculation, scenario),
      discountSection(calculation, scenario),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents: calculation.totalUnitCostCents,
      totalFeeBasisPoints: calculation.totalFeeBasisPoints,
      minimumPriceCents: calculation.minimumPriceCents,
    },
  });
}

export { buildProductReportSnapshot };
