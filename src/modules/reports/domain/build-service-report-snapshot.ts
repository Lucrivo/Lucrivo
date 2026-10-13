import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { formatBasisPoints, formatCurrency } from "../formatters";
import {
  parseCurrentServiceReportSnapshot,
  type CurrentServiceReportSnapshot,
} from "../schemas/service-report-snapshot.schema";
import {
  SERVICE_REPORT_CALCULATION_VERSION,
  SERVICE_REPORT_CONTENT_VERSION,
  SERVICE_REPORT_SCHEMA_VERSION,
  type ReportSection,
} from "../types";
import type { ServiceReportCalculation } from "./calculate-service-report";
import { buildServiceExecutiveSummary } from "./build-service-executive-summary";
import { calculateBreakEvenRevenue } from "./unit-economics";

function breakEvenSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  return {
    key: "break_even",
    title: "Menor preço para não ficar no prejuízo",
    body:
      calculation.minimumPriceCents === null
        ? "Complete a rotina de trabalho para dividir os gastos do mês por hora ou atendimento."
        : `O valor inclui a estrutura, o valor informado para você, materiais e cobranças da venda. Preço atual: ${formatCurrency(calculation.currentPriceCents)}.`,
    emphasisLabel: "Menor preço para não ficar no prejuízo",
    emphasisValue:
      calculation.minimumPriceCents === null
        ? "Ainda não calculado"
        : formatCurrency(calculation.minimumPriceCents),
    tone:
      calculation.minimumPriceCents !== null &&
      calculation.currentPriceCents < calculation.minimumPriceCents
        ? "critical"
        : "neutral",
  };
}

function marginSection(calculation: ServiceReportCalculation): ReportSection {
  return {
    key: "margin_diagnosis",
    title: "Resultado por serviço",
    body: `Custo completo por ${calculation.unit === "hour" ? "hora" : "atendimento"}: ${calculation.unitCostCents === null ? "Ainda não calculado" : formatCurrency(calculation.unitCostCents)}. Valor deixado por venda antes da estrutura: ${calculation.unitContributionCents === null ? "Ainda não calculado" : formatCurrency(calculation.unitContributionCents)}.`,
    emphasisLabel: "Resultado por serviço",
    emphasisValue:
      calculation.unitProfitCents === null
        ? "Ainda não calculado"
        : formatCurrency(calculation.unitProfitCents),
    tone:
      calculation.unitProfitCents === null
        ? "neutral"
        : calculation.unitProfitCents < 0
          ? "critical"
          : "positive",
  };
}

function salesSection(calculation: ServiceReportCalculation): ReportSection {
  const breakEvenRevenueCents = calculateBreakEvenRevenue(
    calculation.monthlyCostCents,
    calculation.currentPriceCents,
    calculation.unitContributionCents ?? 0,
  );
  return {
    key: "sales_goal",
    title: "Quanto você precisa vender",
    body:
      breakEvenRevenueCents === null
        ? "No preço atual, cada serviço ainda não deixa um valor positivo para pagar os gastos do mês. Revise o preço ou os custos antes de definir uma meta de faturamento."
        : "No preço atual, esta é a referência de faturamento mensal necessária para que o valor deixado pelos serviços pague os gastos e o valor informado para você.",
    emphasisLabel: "Faturamento necessário no mês",
    emphasisValue:
      breakEvenRevenueCents === null
        ? "Ainda não calculado"
        : formatCurrency(breakEvenRevenueCents),
    tone: breakEvenRevenueCents === null ? "critical" : "neutral",
  };
}

function discountSection(calculation: ServiceReportCalculation): ReportSection {
  return {
    key: "discount_simulator",
    title: "Como um desconto muda o resultado",
    body:
      calculation.minimumPriceCents === null
        ? "Para calcular um desconto seguro, primeiro precisamos completar a rotina usada para dividir os gastos do mês."
        : `Quanto sobra a cada R$ 100 no preço atual: ${calculation.realMarginBasisPoints === null ? "Ainda não calculado" : formatBasisPoints(calculation.realMarginBasisPoints)}.`,
    emphasisLabel: "Limite antes do prejuízo",
    emphasisValue:
      calculation.breakEvenDiscountPercent === null
        ? "Ainda não calculado"
        : `${calculation.breakEvenDiscountPercent}%`,
    tone: "neutral",
  };
}

function buildServiceReportSnapshot(
  command: NormalizedServiceDiagnosisCommand,
  calculation: ServiceReportCalculation,
): CurrentServiceReportSnapshot {
  return parseCurrentServiceReportSnapshot({
    schemaVersion: SERVICE_REPORT_SCHEMA_VERSION,
    calculationVersion: SERVICE_REPORT_CALCULATION_VERSION,
    contentVersion: SERVICE_REPORT_CONTENT_VERSION,
    category: "service",
    scenario: command.source.pricingMethod,
    currency: "BRL",
    unit: calculation.unit,
    policy: {
      weeklyDivisorHundredths: 433,
      maximumDiscountPercent: 50,
      proLaboreIncluded: true,
    },
    inputs: {
      desiredMonthlyIncomeCents: command.desiredMonthlyIncomeCents,
      fixedMonthlyExpensesCents: command.fixedMonthlyExpensesCents,
      workHoursPeriod: command.workHoursPeriod,
      workPeriodMinutes: command.workPeriodMinutes,
      monthlyWorkMinutes: command.monthlyWorkMinutes,
      weeklyWorkDays: command.weeklyWorkDays,
      hourlyRateCents: command.hourlyRateCents,
      minuteRateCents: command.minuteRateCents,
      appointmentRateCents: command.appointmentRateCents,
      appointmentDurationMinutes: command.appointmentDurationMinutes,
      materialUnitCostCents: command.materialUnitCostCents,
      taxRateBasisPoints: command.taxRateBasisPoints,
      cardFeeRateBasisPoints: command.cardFeeRateBasisPoints,
    },
    source: command.source,
    results: { ...calculation },
    executiveSummary: buildServiceExecutiveSummary(command, calculation),
    sections: [
      breakEvenSection(calculation),
      marginSection(calculation),
      salesSection(calculation),
      discountSection(calculation),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents: calculation.unitCostCents,
      totalFeeBasisPoints: calculation.totalFeeBasisPoints,
      minimumPriceCents: calculation.minimumPriceCents,
    },
  });
}

export { buildServiceReportSnapshot };
