import type { ContractStatus } from "./admin-dashboard.schema";
import type { StatusTone } from "./admin-dashboard.types";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: SAO_PAULO_TIME_ZONE,
});

const snapshotFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: SAO_PAULO_TIME_ZONE,
});

const subscriptionDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: SAO_PAULO_TIME_ZONE,
});

const statusPresentation = {
  pending: { label: "Pendente", tone: "neutral" },
  pending_reconciliation: { label: "Em conciliação", tone: "info" },
  active: { label: "Ativa", tone: "success" },
  cancel_at_period_end: {
    label: "Cancelamento agendado",
    tone: "warning",
  },
  expired: { label: "Expirada", tone: "neutral" },
  canceled: { label: "Cancelada", tone: "danger" },
  refunded: { label: "Reembolsada", tone: "danger" },
  chargeback: { label: "Contestada", tone: "danger" },
  failed: { label: "Falhou", tone: "danger" },
} as const satisfies Record<
  ContractStatus,
  { label: string; tone: StatusTone }
>;

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function formatCompactCurrency(cents: number) {
  return compactCurrencyFormatter.format(cents / 100);
}

function formatPercentage(basisPoints: number) {
  return percentageFormatter.format(basisPoints / 10_000);
}

function formatMonthPeriod(period: string) {
  return monthFormatter.format(new Date(`${period}T12:00:00.000Z`));
}

function formatSnapshotTime(value: string) {
  return snapshotFormatter.format(new Date(value));
}

function formatSubscriptionDate(value: string) {
  const parts = subscriptionDateFormatter.formatToParts(new Date(value));
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  return `${day} ${month} ${year}`;
}

function presentContractStatus(status: ContractStatus) {
  return statusPresentation[status];
}

export {
  formatCompactCurrency,
  formatCurrency,
  formatMonthPeriod,
  formatPercentage,
  formatSnapshotTime,
  formatSubscriptionDate,
  presentContractStatus,
};
