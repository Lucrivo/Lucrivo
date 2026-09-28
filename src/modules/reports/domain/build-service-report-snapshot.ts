import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "../formatters";
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
    emphasisLabel: "Quanto sobra por venda",
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
  const unit = calculation.unit === "hour" ? "horas" : "atendimentos";
  return {
    key: "sales_goal",
    title: "Quantas vendas pagam o mês",
    body:
      calculation.monthlySalesGoal === null
        ? "No preço atual, ainda não há valor positivo por venda para pagar os gastos do mês."
        : `No preço atual, cerca de ${formatIntegerVolume(calculation.monthlySalesGoal)} ${unit} pagam os gastos e separam o valor informado para você.`,
    emphasisLabel: "Quantidade necessária no mês",
    emphasisValue:
      calculation.monthlySalesGoal === null
        ? "Ainda não calculado"
        : `${formatIntegerVolume(calculation.monthlySalesGoal)} ${unit}`,
    tone: calculation.monthlySalesGoal === null ? "critical" : "neutral",
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
