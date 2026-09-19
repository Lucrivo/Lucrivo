import { CalendarDaysIcon, CreditCardIcon, UserRoundIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type {
  AdminDashboardViewModel,
  StatusTone,
} from "../admin-dashboard.types";
import {
  hasAdminSubscriptionFilters,
  type AdminSubscriptionFilters,
} from "../admin-dashboard-filters";
import { RecentSubscriptionFilters } from "./recent-subscription-filters";

const badgeVariantByTone = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  info: "info",
  neutral: "outline",
} as const satisfies Record<
  StatusTone,
  React.ComponentProps<typeof Badge>["variant"]
>;

type Subscription = AdminDashboardViewModel["recentSubscriptions"][number];

function InitialTile({ email }: { email: string }) {
  return (
    <span
      aria-hidden="true"
      className="bg-primary/10 text-primary ring-primary/10 grid size-9 shrink-0 place-items-center rounded-xl text-sm font-semibold ring-1"
    >
      {email.charAt(0).toLocaleUpperCase("pt-BR")}
    </span>
  );
}

function StatusBadge({ subscription }: { subscription: Subscription }) {
  return (
    <Badge variant={badgeVariantByTone[subscription.status.tone]}>
      {subscription.status.label}
    </Badge>
  );
}

function RecentSubscriptions({
  subscriptions,
  filters,
}: {
  subscriptions: AdminDashboardViewModel["recentSubscriptions"];
  filters: AdminSubscriptionFilters;
}) {
  return (
    <section aria-labelledby="recent-subscriptions-title">
      <Card className="border-border/70 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>
            <h2 id="recent-subscriptions-title">Assinaturas recentes</h2>
          </CardTitle>
          <CardDescription>
            Os cinco contratos mais recentes registrados na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <RecentSubscriptionFilters filters={filters} />
          {subscriptions.length === 0 ? (
            <div className="bg-muted/20 grid min-h-36 place-items-center rounded-xl border border-dashed px-5 text-center">
              <div className="space-y-2">
                <CreditCardIcon
                  aria-hidden="true"
                  className="text-muted-foreground mx-auto size-6"
                />
                <p className="text-muted-foreground text-sm">
                  {hasAdminSubscriptionFilters(filters)
                    ? "Nenhuma assinatura corresponde aos filtros."
                    : "Nenhuma assinatura registrada até agora."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table aria-label="Assinaturas recentes">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <InitialTile email={subscription.email} />
                            <span className="max-w-72 truncate font-medium">
                              {subscription.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{subscription.billingModeLabel}</TableCell>
                        <TableCell className="tabular-nums">
                          {subscription.createdAtLabel}
                        </TableCell>
                        <TableCell className="text-right">
                          <StatusBadge subscription={subscription} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="grid gap-3 md:hidden">
                {subscriptions.map((subscription) => (
                  <li
                    key={subscription.id}
                    className="bg-muted/15 grid gap-4 rounded-xl border p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <InitialTile email={subscription.email} />
                      <p className="min-w-0 truncate font-medium">
                        {subscription.email}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <CreditCardIcon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          Modalidade
                        </dt>
                        <dd>{subscription.billingModeLabel}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <CalendarDaysIcon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          Data
                        </dt>
                        <dd className="tabular-nums">
                          {subscription.createdAtLabel}
                        </dd>
                      </div>
                      <div className="col-span-2 flex items-center justify-between gap-3 border-t pt-3">
                        <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <UserRoundIcon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          Status
                        </dt>
                        <dd>
                          <StatusBadge subscription={subscription} />
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export { RecentSubscriptions };
