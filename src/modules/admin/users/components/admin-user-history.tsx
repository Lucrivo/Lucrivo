import Link from "next/link";

import { presentBillingMode } from "@/modules/admin/billing-mode";

import {
  formatDate,
  formatMoney,
  presentAnalysisMode,
  presentCategory,
  presentHistoryKind,
  presentPaymentMethod,
  presentScenario,
} from "../admin-users.formatters";
import type {
  AdminUserHistoryEvent,
  AdminUserHistoryPage,
} from "../admin-users.schema";
import { AdminAiUsage } from "./admin-user-diagnoses";

function assertNever(value: never): never {
  throw new Error(`Unhandled admin history event: ${JSON.stringify(value)}`);
}

function EventDetails({ event }: { event: AdminUserHistoryEvent }) {
  switch (event.kind) {
    case "account_registered":
      return <p>Conta registrada no Lucrivo.</p>;
    case "onboarding_completed":
    case "profile_updated":
      return (
        <p>
          {event.payload.fullName} · {event.payload.segment.name} ·{" "}
          {event.payload.subcategory.customName ??
            event.payload.subcategory.name}
        </p>
      );
    case "whatsapp_consent_granted":
    case "whatsapp_consent_declined":
    case "whatsapp_consent_revoked":
      return (
        <p>
          Origem:{" "}
          {event.payload.source === "onboarding" ? "Onboarding" : "Conta"}
          {" · "}versão {event.payload.copyVersion}
        </p>
      );
    case "diagnosis_created": {
      const category = presentCategory(event.payload.category);
      return (
        <div className="space-y-3">
          <p>
            {category.title} · {presentScenario(event.payload.scenario)} ·{" "}
            {presentAnalysisMode(event.payload.analysisMode)}
          </p>
          <AdminAiUsage usage={event.payload.aiUsage} />
        </div>
      );
    }
    case "subscription_created":
      return (
        <p>
          Plano {presentBillingMode(event.payload.billingMode)} ·{" "}
          {presentPaymentMethod(event.payload.paymentMethod)} ·{" "}
          {formatMoney(event.payload.amountCents)}
        </p>
      );
    case "subscription_activated":
    case "subscription_renewed":
    case "payment_failed":
    case "payment_refunded":
    case "payment_chargeback":
      return (
        <p>
          {presentBillingMode(event.payload.billingMode)} ·{" "}
          {presentPaymentMethod(event.payload.paymentMethod)} ·{" "}
          {formatMoney(event.payload.amountCents)}
          {event.payload.installmentNumber === null
            ? ""
            : ` · parcela ${event.payload.installmentNumber}`}
        </p>
      );
    case "cancellation_requested":
    case "cancellation_confirmed":
    case "subscription_expired":
      return <p>Fim do acesso: {formatDate(event.payload.accessEndsAt)}</p>;
    case "refund_requested":
    case "refund_confirmed":
      return (
        <p>
          Solicitado em {formatDate(event.payload.requestedAt)} · confirmação:{" "}
          {formatDate(event.payload.refundConfirmedAt)}
        </p>
      );
    case "admin_courtesy_granted":
    case "admin_courtesy_ended":
    case "admin_blocked":
    case "admin_unblocked":
    case "admin_soft_deleted":
    case "admin_restored":
      return (
        <div className="space-y-1">
          <p>{event.payload.reason}</p>
          <p className="text-xs">Responsável: {event.payload.actorEmail}</p>
          {event.payload.changes.map((change) => (
            <p key={change.field} className="text-xs">
              {change.field === "blockedAt"
                ? "Bloqueio"
                : change.field === "deletedAt"
                  ? "Exclusão"
                  : "Cortesia"}
              : {formatDate(change.before)} → {formatDate(change.after)}
            </p>
          ))}
        </div>
      );
    default:
      return assertNever(event);
  }
}

function AdminUserHistory({
  page,
  nextHref,
}: {
  page: AdminUserHistoryPage;
  nextHref: string | null;
}) {
  if (page.items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
        Nenhum evento encontrado.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      <p className="text-muted-foreground max-w-[70ch] text-sm leading-relaxed">
        Linha do tempo consolidada a partir dos registros de conta, produto,
        cobrança e ações administrativas.
      </p>
      <ol className="before:bg-border relative space-y-0 before:absolute before:top-3 before:bottom-3 before:left-[0.4375rem] before:w-px">
        {page.items.map((event) => (
          <li
            key={event.eventKey}
            className="relative grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-4 pb-7 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="bg-primary ring-background z-10 mt-1.5 size-3.5 rounded-full ring-4"
            />
            <article className="bg-card min-w-0 rounded-xl border p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-semibold">
                  {presentHistoryKind(event.kind)}
                </h2>
                <time className="text-muted-foreground text-sm">
                  {formatDate(event.occurredAt)}
                </time>
              </div>
              <div className="text-muted-foreground mt-3 text-sm leading-relaxed [overflow-wrap:anywhere]">
                <EventDetails event={event} />
              </div>
            </article>
          </li>
        ))}
      </ol>
      {nextHref && (
        <div className="text-right">
          <Link
            className="text-primary text-sm font-medium underline"
            href={nextHref}
          >
            Próxima página
          </Link>
        </div>
      )}
    </div>
  );
}

export { AdminUserHistory };
