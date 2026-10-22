import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { presentBillingMode } from "@/modules/admin/billing-mode";

import {
  accessLabel,
  formatDate,
  formatMoney,
  presentContractStatus,
  presentPaymentMethod,
} from "../admin-users.formatters";
import type {
  AdminUserDetail,
  AdminUserSubscriptionsPage,
} from "../admin-users.schema";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

function AdminUserSubscriptions({
  user,
  page,
  nextHref,
}: {
  user: Pick<AdminUserDetail, "access" | "subscription">;
  page: AdminUserSubscriptionsPage;
  nextHref: string | null;
}) {
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="current-access-title"
        className="bg-muted/45 rounded-2xl p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="current-access-title" className="text-base font-semibold">
              {user.access === "free"
                ? "Sem acesso contratado"
                : "Acesso vigente"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Origem: {accessLabel(user.access)}
            </p>
          </div>
          {user.access !== "free" && (
            <Badge variant="success">
              <CheckCircle2Icon aria-hidden="true" /> Ativo
            </Badge>
          )}
        </div>
        {user.subscription && (
          <p className="mt-4 text-sm font-medium">
            Plano {presentBillingMode(user.subscription.billingMode)} · até{" "}
            {formatDate(user.subscription.accessEndsAt)}
          </p>
        )}
      </section>

      {page.items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          Nenhum contrato encontrado.
        </p>
      ) : (
        <ul className="space-y-4">
          {page.items.map((subscription) => {
            const status = presentContractStatus(subscription.status);
            return (
              <li key={subscription.id}>
                <Card className="min-w-0 shadow-sm">
                  <CardHeader className="gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          Plano {presentBillingMode(subscription.billingMode)}
                        </CardTitle>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Contratado em {formatDate(subscription.createdAt)}
                        </p>
                      </div>
                      <Badge variant={status.tone}>{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Fact
                        label="Valor cobrado"
                        value={formatMoney(subscription.amountCents)}
                      />
                      <Fact
                        label="Pagamento"
                        value={presentPaymentMethod(subscription.paymentMethod)}
                      />
                      <Fact
                        label="Início do acesso"
                        value={formatDate(subscription.accessStartsAt)}
                      />
                      <Fact
                        label="Fim do acesso"
                        value={formatDate(subscription.accessEndsAt)}
                      />
                    </dl>
                    <div className="text-muted-foreground space-y-1 text-sm">
                      <p>
                        {subscription.payment.confirmedCount} pagamento(s)
                        confirmado(s) ·{" "}
                        {formatMoney(subscription.payment.receivedCents)}{" "}
                        recebido
                      </p>
                      {subscription.cancelAtPeriodEnd && (
                        <p>Cancelamento programado para o fim do período.</p>
                      )}
                      {subscription.refund && (
                        <p>
                          Reembolso solicitado em{" "}
                          {formatDate(subscription.refund.requestedAt)}
                          {subscription.refund.refundConfirmedAt
                            ? ` e confirmado em ${formatDate(subscription.refund.refundConfirmedAt)}`
                            : "."}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

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

export { AdminUserSubscriptions };
