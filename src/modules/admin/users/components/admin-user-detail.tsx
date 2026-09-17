import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  accessLabel,
  accountLabel,
  formatDate,
  formatMoney,
} from "../admin-users.formatters";
import type { AdminUserDetail as User } from "../admin-users.schema";
import { encodeCursor } from "../admin-users.urls";
import { AdminUserActions } from "./admin-user-actions";

type Item = Record<string, unknown>;
type Items = {
  items: Item[];
  nextCursor: { createdAt: string; id: string } | null;
} | null;
type Tab = "profile" | "diagnoses" | "subscription" | "history";
const tabs: { value: Tab; label: string }[] = [
  { value: "profile", label: "Perfil" },
  { value: "diagnoses", label: "Diagnósticos" },
  { value: "subscription", label: "Assinatura" },
  { value: "history", label: "Histórico" },
];
const historyLabels: Record<string, string> = {
  courtesy_granted: "Cortesia concedida",
  courtesy_ended: "Cortesia encerrada",
  blocked: "Usuário bloqueado",
  unblocked: "Usuário desbloqueado",
  soft_deleted: "Usuário excluído",
  restored: "Usuário restaurado",
};
const paymentMethodLabels: Record<string, string> = {
  credit_card: "Cartão de crédito",
  pix: "Pix",
};
const contractStatusLabels: Record<string, string> = {
  pending: "Pendente",
  pending_reconciliation: "Em conciliação",
  active: "Ativa",
  cancel_at_period_end: "Cancelamento agendado",
  expired: "Expirada",
  canceled: "Cancelada",
  refunded: "Reembolsada",
  chargeback: "Contestada",
  failed: "Falhou",
};
const categoryLabels: Record<string, string> = {
  service: "Serviços",
  product: "Produtos",
  production: "Produção",
};

function historyChange(item: Item) {
  const before = item.before as Record<string, string | null>;
  const after = item.after as Record<string, string | null>;
  const changes = [
    ["Bloqueio", before.blockedAt, after.blockedAt],
    ["Exclusão", before.deletedAt, after.deletedAt],
    ["Cortesia", before.courtesyExpiresAt, after.courtesyExpiresAt],
  ].filter(([, oldValue, newValue]) => oldValue !== newValue);
  return changes.map(([label, oldValue, newValue]) => (
    <p key={label} className="text-muted-foreground text-xs">
      {label}: {oldValue ? formatDate(oldValue) : "não"} →{" "}
      {newValue ? formatDate(newValue) : "não"}
    </p>
  ));
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

function itemSummary(item: Item, tab: Tab) {
  if (tab === "diagnoses")
    return (
      <>
        <p className="font-medium">
          {categoryLabels[String(item.category)] ?? String(item.category)} ·{" "}
          {String(item.scenario)}
        </p>
        <p className="text-muted-foreground text-sm">
          {item.isFreeReport ? "Relatório gratuito" : "Relatório com acesso"}
        </p>
      </>
    );
  if (tab === "subscription")
    return (
      <>
        <p className="font-medium">
          {item.billingMode === "monthly" ? "Mensal" : "Anual"} ·{" "}
          {formatMoney(Number(item.amountCents))}
        </p>
        <p className="text-muted-foreground text-sm">
          {contractStatusLabels[String(item.status)] ?? String(item.status)} ·{" "}
          {paymentMethodLabels[String(item.paymentMethod)] ??
            String(item.paymentMethod)}{" "}
          · Acesso: {formatDate(item.accessStartsAt as string | null)} até{" "}
          {formatDate(item.accessEndsAt as string | null)}
        </p>
        <p className="text-muted-foreground text-xs">
          {item.cancelAtPeriodEnd
            ? "Cancelamento ao fim do período"
            : "Sem cancelamento programado"}
        </p>
      </>
    );
  return (
    <>
      <p className="font-medium">
        {historyLabels[String(item.action)] ?? String(item.action)}
      </p>
      <p className="text-muted-foreground text-sm">
        Por {String(item.actorEmail)} · Motivo: {String(item.reason)}
      </p>
      {historyChange(item)}
    </>
  );
}

function AdminUserDetail({
  user,
  tab,
  items,
  back,
}: {
  user: User;
  tab: Tab;
  items: Items;
  back: string;
}) {
  const base = `/admin/users/${user.id}`;
  const context = `from=${encodeURIComponent(back)}`;
  const tabUrl = (value: Tab, cursor?: string) =>
    `${base}?${context}&tab=${value}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6">
      <header className="space-y-4">
        <Link
          href={back}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm underline-offset-4 hover:underline focus-visible:outline-2"
        >
          <ArrowLeftIcon className="size-4" /> Voltar para usuários
        </Link>
        <div className="border-primary/10 flex flex-wrap items-start justify-between gap-4 rounded-3xl border bg-[linear-gradient(135deg,var(--card)_0%,color-mix(in_oklab,var(--primary)_7%,var(--card))_100%)] px-5 py-6 shadow-sm sm:px-7">
          <div className="min-w-0">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              Usuários{" "}
              <ChevronRightIcon className="inline size-3" aria-hidden="true" />{" "}
              Detalhe
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
              {user.email}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm [overflow-wrap:anywhere]">
              ID: {user.id}
            </p>
          </div>
          <AdminUserActions user={user} listContext={back} />
        </div>
      </header>
      <nav
        aria-label="Seções do usuário"
        role="tablist"
        className="flex flex-wrap gap-2 border-b pb-3"
      >
        {tabs.map((entry) => (
          <Link
            key={entry.value}
            href={tabUrl(entry.value)}
            role="tab"
            aria-selected={tab === entry.value}
            className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 ${tab === entry.value ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>
      {tab === "profile" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Dados cadastrais</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <Field label="E-mail">{user.email}</Field>
                <Field label="ID">{user.id}</Field>
                <Field label="Cadastro">{formatDate(user.createdAt)}</Field>
                <Field label="Último acesso">
                  {formatDate(user.lastSignInAt)}
                </Field>
                <Field label="Diagnósticos">{user.diagnosisCount}</Field>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Acesso e situação</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <Field label="Estado">
                  <Badge
                    variant={
                      user.state === "active" ? "success" : "destructive"
                    }
                  >
                    {accountLabel(user.state)}
                  </Badge>
                </Field>
                <Field label="Tipo de acesso">{accessLabel(user.access)}</Field>
                <Field label="Cortesia até">
                  {formatDate(user.courtesyExpiresAt)}
                </Field>
                <Field label="Bloqueado em">{formatDate(user.blockedAt)}</Field>
                <Field label="Excluído em">{formatDate(user.deletedAt)}</Field>
                <Field label="Assinatura atual">
                  {user.subscription
                    ? `${user.subscription.billingMode === "monthly" ? "Mensal" : "Anual"} · até ${formatDate(user.subscription.accessEndsAt)}`
                    : "Nenhuma vigente"}
                </Field>
              </dl>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {tabs.find((entry) => entry.value === tab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tab === "history" && (
              <p className="text-muted-foreground text-sm">
                O histórico administrativo começa com a implantação desta
                funcionalidade. Cadastro: {formatDate(user.createdAt)}; último
                acesso: {formatDate(user.lastSignInAt)}.
              </p>
            )}
            {!items?.items.length ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                Nenhum registro nesta seção.
              </p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {items.items.map((item) => (
                  <li
                    key={String(item.id)}
                    className="flex flex-wrap items-start justify-between gap-3 p-4"
                  >
                    <div className="min-w-0 space-y-1">
                      {itemSummary(item, tab)}
                    </div>
                    <time className="text-muted-foreground text-sm">
                      {formatDate(String(item.createdAt))}
                    </time>
                  </li>
                ))}
              </ul>
            )}
            {items?.nextCursor && (
              <div className="text-right">
                <Link
                  href={tabUrl(tab, encodeCursor(items.nextCursor))}
                  className="text-primary text-sm font-medium underline"
                >
                  Próxima página
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

export { AdminUserDetail };
