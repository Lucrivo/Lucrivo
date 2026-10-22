import {
  presentAnalysisMode as presentClientAnalysisMode,
  presentCategory as presentClientCategory,
  presentPriority as presentClientPriority,
  presentVerdict as presentClientVerdict,
} from "@/modules/client-dashboard/client-dashboard.formatters";
import { formatReportScenario } from "@/modules/reports/formatters";

import type {
  AdminUser,
  AdminUserDiagnosis,
  AdminUserHistoryEvent,
  AdminUserSubscription,
} from "./admin-users.schema";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

type BadgeTone =
  "secondary" | "destructive" | "success" | "warning" | "info" | "outline";

function assertNever(value: never): never {
  throw new Error(`Unhandled administrative presentation value: ${value}`);
}

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Não informado";
}

function formatMoney(cents: number) {
  return moneyFormatter.format(cents / 100);
}

function formatInteger(value: number) {
  return integerFormatter.format(value);
}

function accountLabel(state: AdminUser["state"]) {
  return { active: "Ativo", blocked: "Bloqueado", deleted: "Excluído" }[state];
}

function accessLabel(access: AdminUser["access"]) {
  return { free: "Gratuito", paid: "Assinatura", courtesy: "Cortesia" }[access];
}

function presentCategory(category: AdminUserDiagnosis["category"]) {
  const label = presentClientCategory(category);
  return { label, title: `Diagnóstico de ${label}` };
}

function presentAnalysisMode(mode: AdminUserDiagnosis["analysisMode"]) {
  return presentClientAnalysisMode(mode);
}

function presentScenario(scenario: AdminUserDiagnosis["scenario"]) {
  return formatReportScenario(scenario);
}

function presentVerdict(verdict: AdminUserDiagnosis["verdict"]): {
  label: string;
  tone: BadgeTone;
} {
  switch (verdict) {
    case "missing_price":
    case "incomplete_volume":
      return { ...presentClientVerdict(verdict), tone: "info" };
    case "direct_loss":
    case "operational_loss":
    case "no_sales":
      return { ...presentClientVerdict(verdict), tone: "destructive" };
    case "break_even":
      return { ...presentClientVerdict(verdict), tone: "warning" };
    case "positive_result":
      return { ...presentClientVerdict(verdict), tone: "success" };
    case "tight_margin":
      return { label: "Margem apertada", tone: "warning" };
    case "adequate_margin":
      return { label: "Margem adequada", tone: "success" };
    case "above_target":
      return { label: "Acima da meta", tone: "success" };
    default:
      return assertNever(verdict);
  }
}

function presentPriority(priority: AdminUserDiagnosis["priority"]) {
  return presentClientPriority(priority);
}

function presentPaymentMethod(method: AdminUserSubscription["paymentMethod"]) {
  switch (method) {
    case "credit_card":
      return "Cartão de crédito";
    case "pix":
      return "Pix";
    default:
      return assertNever(method);
  }
}

function presentContractStatus(status: AdminUserSubscription["status"]): {
  label: string;
  tone: BadgeTone;
} {
  switch (status) {
    case "pending":
      return { label: "Pendente", tone: "warning" };
    case "pending_reconciliation":
      return { label: "Em conciliação", tone: "warning" };
    case "active":
      return { label: "Ativa", tone: "success" };
    case "cancel_at_period_end":
      return { label: "Cancelamento agendado", tone: "warning" };
    case "refund_pending":
      return { label: "Reembolso pendente", tone: "warning" };
    case "expired":
      return { label: "Expirada", tone: "secondary" };
    case "canceled":
      return { label: "Cancelada", tone: "secondary" };
    case "refunded":
      return { label: "Reembolsada", tone: "destructive" };
    case "chargeback":
      return { label: "Contestada", tone: "destructive" };
    case "failed":
      return { label: "Falhou", tone: "destructive" };
    default:
      return assertNever(status);
  }
}

function presentHistoryKind(kind: AdminUserHistoryEvent["kind"]): string {
  switch (kind) {
    case "account_registered":
      return "Conta criada";
    case "onboarding_completed":
      return "Onboarding concluído";
    case "profile_updated":
      return "Perfil atualizado";
    case "whatsapp_consent_granted":
      return "Consentimento de WhatsApp concedido";
    case "whatsapp_consent_declined":
      return "Consentimento de WhatsApp recusado";
    case "whatsapp_consent_revoked":
      return "Consentimento de WhatsApp revogado";
    case "diagnosis_created":
      return "Diagnóstico criado";
    case "subscription_created":
      return "Assinatura criada";
    case "subscription_activated":
      return "Assinatura ativada";
    case "subscription_renewed":
      return "Assinatura renovada";
    case "cancellation_requested":
      return "Cancelamento solicitado";
    case "cancellation_confirmed":
      return "Cancelamento confirmado";
    case "subscription_expired":
      return "Assinatura expirada";
    case "refund_requested":
      return "Reembolso solicitado";
    case "refund_confirmed":
      return "Reembolso confirmado";
    case "payment_failed":
      return "Pagamento falhou";
    case "payment_refunded":
      return "Pagamento reembolsado";
    case "payment_chargeback":
      return "Pagamento contestado";
    case "admin_courtesy_granted":
      return "Cortesia concedida";
    case "admin_courtesy_ended":
      return "Cortesia encerrada";
    case "admin_blocked":
      return "Usuário bloqueado";
    case "admin_unblocked":
      return "Usuário desbloqueado";
    case "admin_soft_deleted":
      return "Usuário excluído";
    case "admin_restored":
      return "Usuário restaurado";
    default:
      return assertNever(kind);
  }
}

export {
  accessLabel,
  accountLabel,
  formatDate,
  formatInteger,
  formatMoney,
  presentAnalysisMode,
  presentCategory,
  presentContractStatus,
  presentHistoryKind,
  presentPaymentMethod,
  presentPriority,
  presentScenario,
  presentVerdict,
  type BadgeTone,
};
