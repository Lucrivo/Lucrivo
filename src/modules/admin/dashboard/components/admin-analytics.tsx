"use client";

import { AreaChartIcon, TrendingUpIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import {
  formatCompactCurrency,
  formatCurrency,
  formatPercentage,
} from "../admin-dashboard.formatters";
import type { AdminDashboardViewModel } from "../admin-dashboard.types";

const countFormatter = new Intl.NumberFormat("pt-BR");
const longMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "America/Sao_Paulo",
});

const revenueChartConfig = {
  revenue: { label: "Receita", color: "var(--chart-1)" },
} satisfies ChartConfig;

const growthChartConfig = {
  users: { label: "Novos usuários", color: "var(--chart-2)" },
} satisfies ChartConfig;

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function formatLongMonth(period: string) {
  return capitalize(
    longMonthFormatter.format(new Date(`${period}T12:00:00.000Z`)),
  );
}

function EmptyChart() {
  return (
    <div className="bg-muted/20 grid h-72 place-items-center rounded-xl border border-dashed px-6 text-center">
      <p className="text-muted-foreground max-w-xs text-sm leading-6">
        Ainda não há dados para este período.
      </p>
    </div>
  );
}

function RevenueChart({
  history,
}: {
  history: AdminDashboardViewModel["revenueHistory"];
}) {
  const current = history.at(-1);
  const isEmpty = history.every((point) => point.valueCents === 0);
  const currentSummary = current
    ? `${formatLongMonth(current.period)}: ${formatCurrency(current.valueCents)}`
    : null;

  return (
    <figure aria-labelledby="revenue-chart-title" className="min-w-0">
      <Card className="border-border/70 h-full rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-xl">
              <AreaChartIcon aria-hidden="true" className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <CardTitle>
                <h2 id="revenue-chart-title">Receita dos últimos 12 meses</h2>
              </CardTitle>
              <CardDescription>
                Pagamentos confirmados e recebidos por mês
              </CardDescription>
            </div>
          </div>
          {currentSummary && (
            <CardAction className="hidden sm:block">
              <p className="bg-muted/35 rounded-full border px-3 py-1.5 text-xs font-medium tabular-nums">
                {currentSummary}
              </p>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <EmptyChart />
          ) : (
            <ChartContainer
              config={revenueChartConfig}
              className="h-72 w-full"
              role="img"
              aria-label="Evolução mensal da receita nos últimos 12 meses"
            >
              <AreaChart
                data={history}
                accessibilityLayer
                margin={{ left: 4, right: 10, top: 12 }}
              >
                <defs>
                  <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={58}
                  tickFormatter={formatCompactCurrency}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--border)" }}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value) => (
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <Area
                  dataKey="valueCents"
                  name="Receita"
                  type="monotone"
                  fill="url(#revenue-fill)"
                  stroke="var(--color-revenue)"
                  strokeWidth={2.5}
                  activeDot={{ r: 5, strokeWidth: 3 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </figure>
  );
}

function CancellationPanel({
  metrics,
}: {
  metrics: AdminDashboardViewModel["metrics"];
}) {
  const rate = metrics.cancellationRateBasisPoints;
  const rateLabel = rate === null ? "—" : formatPercentage(rate);
  const cancellationExplanation =
    rate === null
      ? "Não havia assinaturas ativas no início do mês para calcular a taxa."
      : `Base de ${countFormatter.format(metrics.cancellationOpeningBase)} assinaturas no início do mês.`;
  const ringProgress = rate === null ? 0 : Math.min(rate / 100, 100);
  const ringLabel =
    rate === null
      ? "Taxa de cancelamento indisponível"
      : `Taxa de cancelamento de ${rateLabel} no mês`;

  return (
    <Card className="border-border/70 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>
          <h2>Taxa de cancelamento</h2>
        </CardTitle>
        <CardDescription>Saúde da base no mês atual</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-[9.5rem_1fr] sm:items-center xl:grid-cols-1 2xl:grid-cols-[9.5rem_1fr]">
        <div
          role="img"
          aria-label={ringLabel}
          className="relative mx-auto grid size-36 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--primary) ${ringProgress * 3.6}deg, var(--muted) 0deg)`,
          }}
        >
          <div className="bg-card grid size-[7.1rem] place-items-center rounded-full text-center shadow-inner">
            <div>
              <strong className="text-2xl font-semibold tabular-nums">
                {rateLabel}
              </strong>
              <p className="text-muted-foreground mt-1 text-xs">Taxa no mês</p>
            </div>
          </div>
        </div>
        <div className="space-y-2 text-center sm:text-left xl:text-center 2xl:text-left">
          {rate === null && (
            <p className="font-semibold">Sem base suficiente</p>
          )}
          <p className="text-muted-foreground text-sm leading-6">
            {cancellationExplanation}
          </p>
        </div>
      </CardContent>
      <CardFooter className="text-muted-foreground text-xs leading-5">
        Cálculo: cancelamentos confirmados ÷ assinaturas ativas no início do
        mês.
      </CardFooter>
    </Card>
  );
}

function UserGrowthChart({
  growth,
}: {
  growth: AdminDashboardViewModel["userGrowth"];
}) {
  const current = growth.at(-1);
  const isEmpty = growth.every((point) => point.value === 0);
  const currentSummary = current
    ? `${formatLongMonth(current.period)}: ${countFormatter.format(current.value)} cadastros`
    : null;

  return (
    <figure aria-labelledby="growth-chart-title" className="min-w-0">
      <Card className="border-border/70 h-full rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="bg-chart-2/10 text-chart-2 grid size-9 place-items-center rounded-xl">
              <TrendingUpIcon aria-hidden="true" className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <CardTitle>
                <h2 id="growth-chart-title">
                  Novos usuários nos últimos 6 meses
                </h2>
              </CardTitle>
              <CardDescription>Contas criadas por mês</CardDescription>
            </div>
          </div>
          {currentSummary && (
            <CardAction className="hidden sm:block">
              <p className="bg-muted/35 rounded-full border px-3 py-1.5 text-xs font-medium tabular-nums">
                {currentSummary}
              </p>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <EmptyChart />
          ) : (
            <ChartContainer
              config={growthChartConfig}
              className="h-72 w-full"
              role="img"
              aria-label="Novos usuários por mês nos últimos 6 meses"
            >
              <BarChart
                data={growth}
                accessibilityLayer
                margin={{ left: 0, right: 6, top: 12 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={36}
                />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value) => (
                        <span className="font-semibold tabular-nums">
                          {countFormatter.format(Number(value))} novos usuários
                        </span>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="value"
                  name="Novos usuários"
                  fill="var(--color-users)"
                  radius={[7, 7, 2, 2]}
                  maxBarSize={64}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </figure>
  );
}

function AdminAnalytics({ dashboard }: { dashboard: AdminDashboardViewModel }) {
  return (
    <section aria-labelledby="admin-analytics-title" className="grid gap-4">
      <h2 id="admin-analytics-title" className="sr-only">
        Análises operacionais
      </h2>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <RevenueChart history={dashboard.revenueHistory} />
        <CancellationPanel metrics={dashboard.metrics} />
      </div>
      <UserGrowthChart growth={dashboard.userGrowth} />
    </section>
  );
}

export { AdminAnalytics };
