import {
  ActivityIcon,
  BanknoteIcon,
  CircleHelpIcon,
  ClipboardCheckIcon,
  CrownIcon,
  UserMinusIcon,
  UsersRoundIcon,
} from "lucide-react";

import { MetricCard } from "@/components/shared/metrics/metric-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { formatCurrency } from "../admin-dashboard.formatters";
import type { AdminDashboardViewModel } from "../admin-dashboard.types";

const countFormatter = new Intl.NumberFormat("pt-BR");

const metricCardClassName =
  "h-full rounded-2xl border-border/70 bg-card/95 shadow-[0_1px_2px_0_rgb(15_23_42/0.03),0_12px_30px_-24px_rgb(15_23_42/0.35)]";

function NewUsersCard({
  newUsers,
}: {
  newUsers: AdminDashboardViewModel["metrics"]["newUsers"];
}) {
  const periods = [
    { label: "Hoje", value: newUsers.today },
    { label: "Esta semana", value: newUsers.week },
    { label: "Este mês", value: newUsers.month },
  ];

  return (
    <Card className={`${metricCardClassName} relative overflow-hidden`}>
      <div
        aria-hidden="true"
        className="from-primary via-chart-2 absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r to-transparent"
      />
      <CardHeader className="grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-muted-foreground text-sm font-medium">
            Novos usuários
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                aria-label="Entenda Novos usuários"
                closeOnClick={false}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -m-3 grid size-11 shrink-0 place-items-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
              >
                <CircleHelpIcon aria-hidden="true" className="size-4" />
              </TooltipTrigger>
              <TooltipContent role="tooltip">
                Contas criadas em cada período, no horário de São Paulo.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="bg-primary/10 text-primary ring-primary/10 grid size-9 shrink-0 place-items-center rounded-xl ring-1">
          <UsersRoundIcon aria-hidden="true" className="size-[18px]" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/25 grid grid-cols-3 divide-x rounded-xl border">
          {periods.map((period) => (
            <div
              key={period.label}
              className="flex min-w-0 flex-col items-center gap-1 px-2 py-3 text-center"
            >
              <span className="text-muted-foreground text-[0.7rem] leading-4">
                {period.label}
              </span>
              <strong className="text-lg leading-none font-semibold tabular-nums">
                {countFormatter.format(period.value)}
              </strong>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminMetricGrid({
  metrics,
}: {
  metrics: AdminDashboardViewModel["metrics"];
}) {
  const cancellationDescription = `${countFormatter.format(
    metrics.canceledSubscriptions,
  )} ${metrics.canceledSubscriptions === 1 ? "cancelamento" : "cancelamentos"} este mês`;

  return (
    <section aria-labelledby="admin-kpis-title">
      <h2 id="admin-kpis-title" className="sr-only">
        Indicadores principais
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NewUsersCard newUsers={metrics.newUsers} />
        <MetricCard
          title="Usuários ativos"
          value={countFormatter.format(metrics.activeUsers)}
          icon={ActivityIcon}
          description="Com acesso nos últimos 30 dias"
          helpText="Pessoas que entraram no Lucrivo nos últimos 30 dias."
          className={metricCardClassName}
          valueClassName="tabular-nums"
        />
        <MetricCard
          title="Diagnósticos gratuitos"
          value={countFormatter.format(metrics.freeDiagnoses)}
          icon={ClipboardCheckIcon}
          description="Relatórios gratuitos realizados"
          helpText="Total acumulado de diagnósticos concluídos como relatório gratuito."
          className={metricCardClassName}
          valueClassName="tabular-nums"
        />
        <MetricCard
          title="Assinaturas ativas"
          value={countFormatter.format(metrics.activeSubscriptions)}
          icon={CrownIcon}
          description="Com acesso válido agora"
          helpText="Inclui assinaturas ativas e com cancelamento agendado enquanto o acesso estiver válido."
          className={metricCardClassName}
          valueClassName="tabular-nums"
        />
        <MetricCard
          title="Assinaturas canceladas"
          value={countFormatter.format(metrics.canceledSubscriptions)}
          icon={UserMinusIcon}
          description={cancellationDescription}
          helpText="Cancelamentos confirmados durante o mês atual."
          className={metricCardClassName}
          valueClassName="tabular-nums text-destructive"
        />
        <MetricCard
          title="Receita mensal"
          value={formatCurrency(metrics.monthlyRevenueCents)}
          icon={BanknoteIcon}
          description="Confirmada e recebida neste mês"
          helpText="Soma dos pagamentos confirmados ou recebidos durante o mês atual."
          className={metricCardClassName}
          valueClassName="tabular-nums"
        />
      </div>
    </section>
  );
}

export { AdminMetricGrid };
