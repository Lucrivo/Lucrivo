import type { AdminUser } from "./admin-users.schema";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Não informado";
}

function formatMoney(cents: number) {
  return moneyFormatter.format(cents / 100);
}

function accountLabel(state: AdminUser["state"]) {
  return { active: "Ativo", blocked: "Bloqueado", deleted: "Excluído" }[state];
}

function accessLabel(access: AdminUser["access"]) {
  return { free: "Gratuito", paid: "Assinatura", courtesy: "Cortesia" }[access];
}

export { accessLabel, accountLabel, formatDate, formatMoney };
