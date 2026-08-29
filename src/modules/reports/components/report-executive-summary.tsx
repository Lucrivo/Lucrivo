import {
  CircleCheckIcon,
  CircleHelpIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ReportExecutiveSummaryViewModel } from "../presenters/to-report-view-model";
import type { ReportTone } from "../types";

const tonePresentation = {
  neutral: {
    icon: CircleHelpIcon,
    badge: "info" as const,
    border: "border-l-info",
    surface: "bg-info/4",
    verdictSurface: "bg-info/5",
  },
  positive: {
    icon: CircleCheckIcon,
    badge: "success" as const,
    border: "border-l-success",
    surface: "bg-success/4",
    verdictSurface: "bg-success/5",
  },
  warning: {
    icon: TriangleAlertIcon,
    badge: "warning" as const,
    border: "border-l-warning",
    surface: "bg-warning/5",
    verdictSurface: "bg-warning/6",
  },
  critical: {
    icon: OctagonAlertIcon,
    badge: "destructive" as const,
    border: "border-l-destructive",
    surface: "bg-destructive/4",
    verdictSurface: "bg-destructive/5",
  },
} satisfies Record<
  ReportTone,
  {
    icon: typeof CircleHelpIcon;
    badge: "info" | "success" | "warning" | "destructive";
    border: string;
    surface: string;
    verdictSurface: string;
  }
>;

function ReportExecutiveSummary({
  summary,
}: {
  summary: ReportExecutiveSummaryViewModel;
}) {
  const presentation = tonePresentation[summary.verdict.tone];
  const VerdictIcon = presentation.icon;

  return (
    <section
      aria-labelledby="executive-summary-title"
      className={cn(
        "border-border/70 relative overflow-hidden rounded-3xl border border-l-4 shadow-sm",
        presentation.border,
        presentation.surface,
      )}
    >
      <div
        aria-hidden="true"
        className="bg-primary/6 pointer-events-none absolute -top-32 -right-16 size-72 rounded-full blur-3xl"
      />
      <header className="relative grid gap-2 px-5 pt-6 sm:px-8 sm:pt-8">
        <h2
          id="executive-summary-title"
          className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl"
        >
          {summary.headline}
        </h2>
        <p className="text-muted-foreground max-w-3xl leading-6">
          {summary.introduction}
        </p>
      </header>

      <div className="relative grid gap-4 p-5 sm:p-8">
        <div
          aria-label={`Veredito: ${summary.verdict.label}`}
          className={cn(
            "border-border/70 grid gap-5 rounded-2xl border p-4 shadow-xs sm:p-5",
            presentation.verdictSurface,
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid max-w-3xl gap-2">
              <h3 className="text-xl font-semibold">{summary.verdict.label}</h3>
              <p className="text-foreground/86 leading-6">
                {summary.verdict.body}
              </p>
            </div>
            <Badge variant={presentation.badge}>
              <VerdictIcon aria-hidden="true" />
              {summary.verdict.toneLabel}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {summary.facts.map((fact) => (
              <dl
                key={fact.key}
                className="border-border/70 bg-background/75 grid gap-2 rounded-xl border p-3.5"
              >
                <div className="flex items-end justify-between gap-3">
                  <dt className="text-muted-foreground text-xs font-medium">
                    {fact.currentLabel}
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {fact.currentValue}
                  </dd>
                </div>
                <div className="border-border/60 flex items-end justify-between gap-3 border-t pt-2">
                  <dt className="text-muted-foreground text-xs font-medium">
                    {fact.referenceLabel}
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {fact.referenceValue}
                  </dd>
                </div>
              </dl>
            ))}
          </div>
        </div>

        <div className="border-l-primary bg-primary/7 grid gap-2 rounded-2xl border-l-4 p-4 sm:p-5">
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            Principal ponto a corrigir
          </p>
          <h3 className="text-lg font-semibold">{summary.priority.label}</h3>
          <p className="text-foreground/86 leading-6">
            {summary.priority.body}
          </p>
        </div>

        <ol className="border-border/70 bg-background/75 divide-border divide-y rounded-2xl border px-4 shadow-xs sm:px-5">
          {summary.answers.map((answer, index) => (
            <li
              key={answer.key}
              className="grid grid-cols-[2rem_1fr] gap-3 py-4"
            >
              <span
                aria-hidden="true"
                className="bg-primary/10 text-primary grid size-8 place-items-center rounded-lg font-semibold"
              >
                {index + 1}
              </span>
              <div className="grid gap-1">
                <h3 className="text-muted-foreground text-sm font-medium">
                  {answer.question}
                </h3>
                <p className="leading-6 font-semibold">{answer.answer}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export { ReportExecutiveSummary };
