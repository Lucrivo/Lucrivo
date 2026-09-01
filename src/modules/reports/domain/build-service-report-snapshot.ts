import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  formatBillableHours,
  formatCurrency,
  formatIntegerVolume,
  formatReportUnit,
} from "../formatters";
import {
  parseServiceReportSnapshot,
  type ServiceReportSnapshotV2,
} from "../schemas/service-report-snapshot.schema";
import {
  SERVICE_CALCULATION_VERSION,
  SERVICE_CONTENT_VERSION,
  SERVICE_REPORT_SCHEMA_VERSION,
  type ReportSection,
  type ReportTone,
  type ServiceReportVerdict,
} from "../types";
import {
  SERVICE_TARGET_MARGIN_BPS,
  type ServiceReportCalculation,
} from "./calculate-service-report";
import { buildExecutiveSummary } from "./build-executive-summary";

const verdictContent: Record<
  ServiceReportVerdict,
  { label: string; body: string; tone: ReportTone }
> = {
  missing_price: {
    label: "Informe o preço",
    body: "Preencha o preço atual para diagnosticar sua margem.",
    tone: "neutral",
  },
  operational_loss: {
    label: "Preço não cobre a operação",
    body: "O preço atual não cobre toda a operação.",
    tone: "critical",
  },
  tight_margin: {
    label: "Margem apertada",
    body: "O preço cobre os custos, mas sobra menos que o desejado.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Margem adequada",
    body: "O preço é suficiente para alcançar a meta.",
    tone: "positive",
  },
  above_target: {
    label: "Acima da meta",
    body: "Há folga; valide a aceitação do mercado.",
    tone: "positive",
  },
};

function buildBreakEvenSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  const unit = formatReportUnit(calculation.unit);
  const minimumPrice = calculation.minimumPriceCents;
  const currentPrice = calculation.currentPriceCents;

  if (minimumPrice === null) {
    return {
      key: "break_even",
      title: "1 · Ponto de equilíbrio",
      body: "Informe sua capacidade faturável e mantenha as taxas abaixo de 100% para calcular o ponto de equilíbrio.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "neutral",
    };
  }

  const comparison =
    currentPrice <= 0
      ? "Informe seu preço atual para comparar com o custo."
      : currentPrice >= minimumPrice
        ? `Seu preço de ${formatCurrency(currentPrice)} cobre o custo.`
        : `Seu preço de ${formatCurrency(currentPrice)} não cobre o custo.`;

  return {
    key: "break_even",
    title: "1 · Ponto de equilíbrio",
    body: `Abaixo de ${formatCurrency(minimumPrice)} por ${unit} você vende no prejuízo. ${comparison}`,
    emphasisLabel: "Preço mínimo",
    emphasisValue: formatCurrency(minimumPrice),
    tone:
      currentPrice <= 0
        ? "neutral"
        : currentPrice >= minimumPrice
          ? "positive"
          : "critical",
  };
}

function buildHiddenCostSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  if (calculation.hourCostCents === null) {
    return {
      key: "hidden_cost",
      title: "2 · A conta que ninguém faz",
      body: "Informe quantas horas do mês são realmente pagas para descobrir o custo real da sua hora.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "neutral",
    };
  }

  const unit = formatReportUnit(calculation.unit);
  const profit = calculation.unitProfitCents;

  return {
    key: "hidden_cost",
    title: "2 · A conta que ninguém faz",
    body: `Só ${formatBillableHours(calculation.monthlyWorkMinutes)}h/mês são realmente pagas — é sobre elas que caem seus custos. Por isso a hora custa ${formatCurrency(calculation.hourCostCents)}, não o que você imagina. É com esse número que a conta fecha.`,
    emphasisLabel: profit === null ? null : `Lucro por ${unit}`,
    emphasisValue: profit === null ? null : formatCurrency(profit),
    tone: profit === null ? "neutral" : profit > 0 ? "positive" : "critical",
  };
}

function buildMarginDiagnosisSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  const content = verdictContent[calculation.verdict];

  return {
    key: "margin_diagnosis",
    title: "3 · Diagnóstico da margem",
    body: content.body,
    emphasisLabel:
      calculation.realMarginBasisPoints === null ? null : "Margem real",
    emphasisValue: content.label,
    tone: content.tone,
  };
}

function pluralUnit(calculation: ServiceReportCalculation): string {
  return calculation.unit === "hour" ? "horas" : "atendimentos";
}

function buildSalesGoalSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  if (
    calculation.verdict === "missing_price" ||
    calculation.verdict === "operational_loss"
  ) {
    return {
      key: "sales_goal",
      title: "Meta de vendas",
      body: "Seu preço atual não sustenta a operação. Corrija o preço antes de buscar mais volume.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "critical",
    };
  }

  const monthly = calculation.monthlySalesGoal;
  const weekly = calculation.weeklySalesGoal;
  const daily = calculation.dailySalesGoal;
  if (monthly === null || weekly === null) {
    return {
      key: "sales_goal",
      title: "Meta de vendas",
      body: "A meta de vendas fica disponível quando preço, taxas e capacidade formam uma referência válida.",
      emphasisLabel: null,
      emphasisValue: null,
      tone: "neutral",
    };
  }

  const unit = pluralUnit(calculation);
  const dailyCopy =
    daily === null
      ? ". Informe seus dias de trabalho para calcular a meta diária."
      : ` e ${formatIntegerVolume(daily)} por dia.`;

  return {
    key: "sales_goal",
    title: "Meta de vendas",
    body: `Para cobrir seus custos fixos (pró-labore incluído), sua meta é de ${formatIntegerVolume(monthly)} ${unit} por mês, ${formatIntegerVolume(weekly)} por semana${dailyCopy}`,
    emphasisLabel: "Meta mensal",
    emphasisValue: `${formatIntegerVolume(monthly)} ${unit}`,
    tone: "positive",
  };
}

function buildDiscountSimulatorSection(
  calculation: ServiceReportCalculation,
): ReportSection {
  return {
    key: "discount_simulator",
    title: "Quanto de desconto eu consigo dar sem destruir minha margem?",
    body: "Arraste e veja o preço, a margem e o lucro mudarem — e onde está o seu limite.",
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
  command: ServiceDiagnosisCommand,
  calculation: ServiceReportCalculation,
): ServiceReportSnapshotV2 {
  const { unit, totalFeeBasisPoints } = calculation;
  const results = {
    monthlyCostCents: calculation.monthlyCostCents,
    hourCostCents: calculation.hourCostCents,
    unitCostCents: calculation.unitCostCents,
    currentPriceCents: calculation.currentPriceCents,
    netRevenueCents: calculation.netRevenueCents,
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
  };

  return parseServiceReportSnapshot({
    schemaVersion: SERVICE_REPORT_SCHEMA_VERSION,
    calculationVersion: SERVICE_CALCULATION_VERSION,
    contentVersion: SERVICE_CONTENT_VERSION,
    category: "service",
    scenario: command.pricingMethod,
    currency: "BRL",
    unit,
    policy: {
      targetMarginBasisPoints: SERVICE_TARGET_MARGIN_BPS,
      weeklyDivisorHundredths: 433,
      maximumDiscountPercent: 50,
      proLaboreIncluded: true,
    },
    inputs: {
      desiredMonthlyIncomeCents: command.desiredMonthlyIncomeCents,
      fixedMonthlyExpensesCents: command.fixedMonthlyExpensesCents,
      monthlyWorkMinutes: command.monthlyWorkMinutes,
      weeklyWorkDays: command.weeklyWorkDays,
      hourlyRateCents: command.hourlyRateCents,
      minuteRateCents: command.minuteRateCents,
      appointmentRateCents: command.appointmentRateCents,
      appointmentDurationMinutes: command.appointmentDurationMinutes,
      taxRateBasisPoints: command.taxRateBasisPoints,
      cardFeeRateBasisPoints: command.cardFeeRateBasisPoints,
    },
    results,
    executiveSummary: buildExecutiveSummary(calculation),
    sections: [
      buildBreakEvenSection(calculation),
      buildHiddenCostSection(calculation),
      buildMarginDiagnosisSection(calculation),
      buildSalesGoalSection(calculation),
      buildDiscountSimulatorSection(calculation),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents: calculation.unitCostCents,
      totalFeeBasisPoints,
      targetMarginBasisPoints: SERVICE_TARGET_MARGIN_BPS,
      minimumPriceCents: calculation.minimumPriceCents,
    },
  });
}

export { buildServiceReportSnapshot };
