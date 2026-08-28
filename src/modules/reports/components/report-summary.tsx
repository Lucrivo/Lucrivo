import { ArrowRightIcon, CircleCheckBigIcon, TargetIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ReportViewModel } from "../presenters/to-report-view-model";

const verdictBadge = {
  neutral: "info",
  positive: "success",
  warning: "warning",
  critical: "destructive",
} as const;

function ReportSummary({ viewModel }: { viewModel: ReportViewModel }) {
  return (
    <aside
      aria-label="Resumo da decisão"
      className="grid content-start gap-4 lg:sticky lg:top-24"
    >
      <Card className="border-primary/20 bg-primary text-primary-foreground overflow-hidden shadow-lg shadow-blue-950/15">
        <CardHeader className="gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-primary-foreground/65 text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
              Leitura principal
            </p>
            <Badge
              variant={verdictBadge[viewModel.summary.verdict.tone]}
              className="bg-background/95"
            >
              <CircleCheckBigIcon
                aria-label={viewModel.summary.verdict.toneLabel}
              />
              {viewModel.summary.verdict.toneLabel}
            </Badge>
          </div>
          <div className="grid gap-2">
            <CardTitle className="text-2xl leading-tight font-semibold text-white">
              {viewModel.summary.verdict.label}
            </CardTitle>
            <p className="text-primary-foreground/80 leading-6">
              {viewModel.summary.verdict.description}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/15 p-px">
          {viewModel.summary.metrics.map((metric, index) => (
            <dl
              key={metric.key}
              className={`bg-primary/85 grid gap-1 p-3.5 ${index === 0 ? "col-span-2" : ""}`}
            >
              <dt className="text-primary-foreground/65 text-xs">
                {metric.label}
              </dt>
              <dd className="text-lg font-semibold text-white tabular-nums">
                {metric.value}
              </dd>
            </dl>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-xs">
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2">
            <TargetIcon aria-hidden="true" className="text-primary size-4" />
            Referências de preço
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {viewModel.priceReferences.map((reference) => (
            <dl
              key={reference.key}
              className="flex items-end justify-between gap-4"
            >
              <dt className="text-muted-foreground text-xs font-medium">
                {reference.label}
              </dt>
              <dd className="font-semibold tabular-nums">{reference.value}</dd>
            </dl>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/15 bg-accent/35 shadow-xs">
        <CardHeader className="gap-2 border-b pb-4">
          <p className="text-primary text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
            Prioridade agora
          </p>
          <CardTitle className="text-xl">
            {viewModel.summary.priority.label}
          </CardTitle>
          <p className="text-muted-foreground text-sm leading-6">
            {viewModel.summary.priority.description}
          </p>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3">
            {viewModel.nextActions.map((action) => (
              <li key={action} className="flex gap-2.5 text-sm leading-5">
                <ArrowRightIcon
                  aria-hidden="true"
                  className="text-primary mt-0.5 size-4 shrink-0"
                />
                {action}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </aside>
  );
}

export { ReportSummary };
