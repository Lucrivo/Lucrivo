import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  formatCurrency,
  formatIntegerVolume,
  formatReportUnit,
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
  type ReportTone,
  type ServiceReportVerdict,
} from "../types";
import {
  SERVICE_TARGET_MARGIN_BPS,
  type ServiceReportCalculation,
} from "./calculate-service-report";
import { buildServiceExecutiveSummary } from "./build-service-executive-summary";

const marginReading: Record<
  ServiceReportVerdict,
  { label: string; body: string; tone: ReportTone }
> = {
  missing_price: {
    label: "Não calculado",
    body: "Informe quanto você cobra para calcular quanto sobra.",
    tone: "neutral",
  },
  direct_loss: {
    label: "Prejuízo",
    body: "O preço não paga os materiais e as taxas informadas.",
    tone: "critical",
  },
  operational_loss: {
    label: "Prejuízo",
    body: "O preço não paga todos os gastos usados no cálculo.",
    tone: "critical",
  },
  tight_margin: {
    label: "Pouca folga",
    body: "O preço paga os gastos, mas deixa pouco espaço para imprevistos.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Boa folga",
    body: "O preço paga os gastos e deixa espaço para imprevistos.",
    tone: "positive",
  },
  above_target: {
    label: "Boa folga",
    body: "O preço paga os gastos e deixa espaço para imprevistos.",
    tone: "positive",
  },
};

function buildBreakEvenSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  const minimum = calculation.minimumPriceCents;
  const current = calculation.currentPriceCents;
  const unit = formatReportUnit(calculation.unit);

  if (minimum === null) {
    return {
      key: "break_even",
      title: "Seu menor preço sem prejuízo",
      body: "Complete os dados de rotina e taxas para calcular este valor.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "neutral",
    };
  }

  const difference = Math.abs(current - minimum);
  const comparison =
    current >= minimum
      ? `Você cobra ${formatCurrency(current)}, ${formatCurrency(difference)} acima desse valor por ${unit}.`
      : `Você cobra ${formatCurrency(current)}. Faltam ${formatCurrency(difference)} por ${unit} para pagar tudo.`;

  return {
    key: "break_even",
    title: "Seu menor preço sem prejuízo",
    body: comparison,
    emphasisLabel: "Menor preço sem prejuízo",
    emphasisValue: formatCurrency(minimum),
    tone: current >= minimum ? "positive" : "critical",
  };
}

function buildMarginSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  const content = marginReading[calculation.verdict];
  return {
    key: "margin_diagnosis",
    title: "Quanto sobra no preço",
    body: content.body,
    emphasisLabel:
      calculation.realMarginBasisPoints === null
        ? null
        : "A cada R$ 100 cobrados",
    emphasisValue:
      calculation.realMarginBasisPoints === null
        ? content.label
        : formatCurrency(calculation.realMarginBasisPoints),
    tone: content.tone,
  };
}

function pluralUnit(calculation: ServiceReportCalculation): string {
  return calculation.unit === "hour" ? "horas" : "atendimentos";
}

function buildSalesSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  const unit = pluralUnit(calculation);
  const monthly = calculation.monthlySalesGoal;
  const weekly = calculation.weeklySalesGoal;
  const daily = calculation.dailySalesGoal;

  if (monthly === null || weekly === null) {
    return {
      key: "sales_goal",
      title: "Quanto você precisa vender",
      body: "Primeiro ajuste o preço para pagar todos os gastos. Depois será possível calcular uma quantidade sustentável.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "critical",
    };
  }

  const dailyText =
    daily === null
      ? ""
      : ` e ${formatIntegerVolume(daily)} por dia de trabalho`;
  return {
    key: "sales_goal",
    title: "Quanto você precisa vender",
    body: `Isso equivale a ${formatIntegerVolume(weekly)} por semana${dailyText}.`,
    emphasisLabel: "Por mês",
    emphasisValue: `${formatIntegerVolume(monthly)} ${unit}`,
    tone: "positive",
  };
}

function buildDiscountSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  return {
    key: "discount_simulator",
    title: "Como um desconto muda o resultado",
    body: "Teste um desconto e veja quanto sobra no novo preço.",
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
      targetMarginBasisPoints: SERVICE_TARGET_MARGIN_BPS,
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
    results: {
      monthlyCostCents: calculation.monthlyCostCents,
      hourCostCents: calculation.hourCostCents,
      structureUnitCostCents: calculation.structureUnitCostCents,
      materialUnitCostCents: calculation.materialUnitCostCents,
      unitCostCents: calculation.unitCostCents,
      currentPriceCents: calculation.currentPriceCents,
      netRevenueCents: calculation.netRevenueCents,
      unitContributionCents: calculation.unitContributionCents,
      unitProfitCents: calculation.unitProfitCents,
      realMarginBasisPoints: calculation.realMarginBasisPoints,
      minimumPriceCents: calculation.minimumPriceCents,
      targetPriceCents: calculation.targetPriceCents,
      monthlySalesGoal: calculation.monthlySalesGoal,
      weeklySalesGoal: calculation.weeklySalesGoal,
      dailySalesGoal: calculation.dailySalesGoal,
      breakEvenDiscountPercent: calculation.breakEvenDiscountPercent,
      verdict: calculation.verdict,
      priority: calculation.priority,
    },
    executiveSummary: buildServiceExecutiveSummary(command, calculation),
    sections: [
      buildBreakEvenSection(calculation),
      buildMarginSection(calculation),
      buildSalesSection(calculation),
      buildDiscountSection(calculation),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents: calculation.unitCostCents,
      totalFeeBasisPoints: calculation.totalFeeBasisPoints,
      targetMarginBasisPoints: SERVICE_TARGET_MARGIN_BPS,
      minimumPriceCents: calculation.minimumPriceCents,
    },
  });
}

export { buildServiceReportSnapshot };
