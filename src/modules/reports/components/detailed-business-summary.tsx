import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react";

import { PlainLanguageHelp } from "@/components/shared/plain-language-help";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type { DetailedReportViewModel } from "../presenters/to-detailed-report-view-model";

type SummaryProps = Pick<
  DetailedReportViewModel,
  "conclusion" | "priority" | "metrics"
>;

const toneStyles = {
  neutral: "border-info/25 bg-info/5",
  positive: "border-success/25 bg-success/5",
  warning: "border-warning/30 bg-warning/5",
  critical: "border-destructive/25 bg-destructive/5",
} as const;

function DetailedBusinessSummary({
  conclusion,
  priority,
  metrics,
}: SummaryProps) {
  const ConclusionIcon =
    conclusion.tone === "positive"
      ? CircleCheckIcon
      : conclusion.tone === "neutral"
        ? InfoIcon
        : CircleAlertIcon;

  return (
    <section
      aria-labelledby="detailed-conclusion"
      className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.8fr)]"
    >
      <div className="grid gap-4">
        <Card
          className={`overflow-hidden shadow-sm ${toneStyles[conclusion.tone]}`}
        >
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
                Como está seu negócio
              </h2>
              <Badge
                variant={
                  conclusion.tone === "positive"
                    ? "success"
                    : conclusion.tone === "critical"
                      ? "destructive"
                      : conclusion.tone === "warning"
                        ? "warning"
                        : "info"
                }
              >
                <ConclusionIcon aria-hidden="true" />
                {conclusion.completenessLabel}
              </Badge>
            </div>
            <h3 id="detailed-conclusion" className="text-2xl sm:text-3xl">
              {conclusion.title}
            </h3>
            <p className="text-muted-foreground max-w-3xl leading-6">
              {conclusion.description}
            </p>
          </CardHeader>
        </Card>

        <Card className={`shadow-xs ${toneStyles[priority.tone]}`}>
          <CardContent className="grid gap-2 py-1">
            <h2 className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
              O que fazer primeiro
            </h2>
            <h3 className="text-lg font-semibold">{priority.title}</h3>
            <p className="text-muted-foreground leading-6">{priority.body}</p>
          </CardContent>
        </Card>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        {metrics.map((metric) => (
          <Card key={metric.key} className={toneStyles[metric.tone]}>
            <CardContent className="grid gap-1.5 py-1">
              <dt className="text-muted-foreground text-sm">{metric.label}</dt>
              <dd className="text-xl font-semibold tracking-tight tabular-nums">
                {metric.valueLabel}
              </dd>
              {metric.unavailableReason ? (
                <p className="text-muted-foreground text-xs leading-5">
                  {metric.unavailableReason}
                </p>
              ) : null}
              {metric.help ? <PlainLanguageHelp {...metric.help} /> : null}
            </CardContent>
          </Card>
        ))}
      </dl>
    </section>
  );
}

export { DetailedBusinessSummary };
