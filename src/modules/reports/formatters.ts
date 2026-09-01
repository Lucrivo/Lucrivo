import type { ReportScenario, ReportUnit } from "./types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const hoursFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const reportDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const scenarioLabels = {
  hour: "Por hora",
  minute: "Por minuto",
  appointment: "Por atendimento",
  resale: "Revenda",
  manufacturing: "Fabricação própria",
} as const satisfies Record<ReportScenario, string>;

const unitLabels = {
  hour: "hora",
  appointment: "atendimento",
  unit: "unidade",
} as const satisfies Record<ReportUnit, string>;

function requireSafeInteger(value: number): void {
  if (!Number.isSafeInteger(value)) throw new Error("unsafe_integer");
}

function normalizeSpacing(value: string): string {
  return value.replace(/\u00a0/g, " ");
}

function formatCurrency(cents: number): string {
  requireSafeInteger(cents);
  return normalizeSpacing(currencyFormatter.format(cents / 100));
}

function formatBasisPoints(basisPoints: number): string {
  requireSafeInteger(basisPoints);
  return normalizeSpacing(percentageFormatter.format(basisPoints / 10_000));
}

function formatIntegerVolume(value: number): string {
  requireSafeInteger(value);
  return integerFormatter.format(value);
}

function formatBillableHours(minutes: number): string {
  requireSafeInteger(minutes);
  return hoursFormatter.format(minutes / 60);
}

function formatReportScenario(scenario: ReportScenario): string {
  return scenarioLabels[scenario];
}

function formatReportUnit(unit: ReportUnit): string {
  return unitLabels[unit];
}

function formatReportDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) throw new Error("invalid_date");
  return reportDateFormatter.format(date);
}

export {
  formatBasisPoints,
  formatBillableHours,
  formatCurrency,
  formatIntegerVolume,
  formatReportDate,
  formatReportScenario,
  formatReportUnit,
};
