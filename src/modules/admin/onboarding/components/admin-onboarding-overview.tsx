"use client";

import {
  BadgeCheckIcon,
  ChartNoAxesColumnIncreasingIcon,
  ClipboardCheckIcon,
  PercentIcon,
  UsersRoundIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import { MetricCard } from "@/components/shared/metrics/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

import type { AdminOnboardingOverview as Overview } from "../admin-onboarding.schema";

const countFormatter = new Intl.NumberFormat("pt-BR");
const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const generatedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const chartConfig = {
  count: { label: "Perfis", color: "var(--chart-2)" },
} satisfies ChartConfig;

function formatRate(value: number | null) {
  return value === null
    ? "Ainda sem dados"
    : percentageFormatter.format(value / 10_000);
}

function DistributionCard({
  title,
  description,
  chartLabel,
  listLabel,
  data,
}: {
  title: string;
  description: string;
  chartLabel: string;
  listLabel: string;
  data: Overview["segments"] | Overview["subcategories"];
}) {
  return (
    <Card className="border-border/70 min-w-0 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="bg-muted/20 grid min-h-64 place-items-center rounded-xl border border-dashed px-6 text-center">
            <p className="text-muted-foreground max-w-xs text-sm leading-6">
              Ainda não há perfis concluídos neste período.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(13rem,0.6fr)] xl:items-center">
            <ChartContainer
              config={chartConfig}
              className="h-72 w-full"
              role="img"
              aria-label={chartLabel}
            >
              <BarChart
                data={data}
                layout="vertical"
                accessibilityLayer
                margin={{ top: 8, right: 38, bottom: 8, left: 8 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={104}
                  tick={{ fontSize: 11 }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={34}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="count"
                    position="right"
                    className="fill-foreground font-medium"
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
            <ol aria-label={listLabel} className="grid gap-2">
              {data.map((item, index) => (
                <li
                  key={`${item.id ?? "other"}-${item.name}`}
                  className="bg-muted/20 flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">
                    {index + 1}.
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {item.name}
                  </span>
                  <strong className="tabular-nums">
                    {countFormatter.format(item.count)}
                  </strong>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminOnboardingOverview({ overview }: { overview: Overview }) {
  const { metrics } = overview;
  const cardClassName =
    "h-full rounded-2xl border-border/70 bg-card/95 shadow-[0_1px_2px_0_rgb(15_23_42/0.03),0_12px_30px_-24px_rgb(15_23_42/0.35)]";

  return (
    <div className="grid gap-6">
      <section aria-labelledby="onboarding-metrics-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="onboarding-metrics-title" className="text-lg font-semibold">
            Indicadores da coorte
          </h2>
          <p className="text-muted-foreground text-xs tabular-nums">
            Atualizado em{" "}
            {generatedAtFormatter.format(new Date(overview.generatedAt))}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Contas na coorte"
            value={countFormatter.format(metrics.accountCount)}
            icon={UsersRoundIcon}
            description="Contas confirmadas no período"
            className={cardClassName}
            valueClassName="tabular-nums"
          />
          <MetricCard
            title="Perfis concluídos"
            value={countFormatter.format(metrics.completedCount)}
            icon={ClipboardCheckIcon}
            description="Onboardings finalizados"
            className={cardClassName}
            valueClassName="tabular-nums"
          />
          <MetricCard
            title="Taxa de preenchimento"
            value={formatRate(metrics.completionRateBasisPoints)}
            icon={ChartNoAxesColumnIncreasingIcon}
            description="Perfis concluídos ÷ contas"
            className={cardClassName}
            valueClassName="tabular-nums text-2xl"
          />
          <MetricCard
            title="Consentimentos ativos"
            value={countFormatter.format(metrics.activeConsentCount)}
            icon={BadgeCheckIcon}
            description="Entre os perfis concluídos"
            className={cardClassName}
            valueClassName="tabular-nums"
          />
          <MetricCard
            title="Taxa de consentimento"
            value={formatRate(metrics.consentRateBasisPoints)}
            icon={PercentIcon}
            description="Autorizações ÷ perfis concluídos"
            className={cardClassName}
            valueClassName="tabular-nums text-2xl"
          />
        </div>
      </section>

      <section aria-label="Distribuições dos perfis" className="grid gap-4">
        <DistributionCard
          title="Perfis por segmento"
          description="Ranking dos segmentos informados no onboarding"
          chartLabel="Perfis concluídos por segmento"
          listLabel="Distribuição por segmento"
          data={overview.segments}
        />
        <DistributionCard
          title="Perfis por subcategoria"
          description="Ranking das especialidades informadas"
          chartLabel="Perfis concluídos por subcategoria"
          listLabel="Distribuição por subcategoria"
          data={overview.subcategories}
        />
      </section>
    </div>
  );
}

export { AdminOnboardingOverview };
