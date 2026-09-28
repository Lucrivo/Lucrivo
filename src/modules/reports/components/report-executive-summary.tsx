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
    border: "border-info/30",
    surface: "bg-info/4",
  },
  positive: {
    icon: CircleCheckIcon,
    badge: "success" as const,
    border: "border-success/30",
    surface: "bg-success/4",
  },
  warning: {
    icon: TriangleAlertIcon,
    badge: "warning" as const,
    border: "border-warning/35",
    surface: "bg-warning/5",
  },
  critical: {
    icon: OctagonAlertIcon,
    badge: "destructive" as const,
    border: "border-destructive/30",
    surface: "bg-destructive/4",
  },
} satisfies Record<
  ReportTone,
  {
    icon: typeof CircleHelpIcon;
    badge: "info" | "success" | "warning" | "destructive";
    border: string;
    surface: string;
  }
>;

function ReportExecutiveSummary({
  summary,
  priorityEyebrow,
}: {
  summary: ReportExecutiveSummaryViewModel;
  priorityEyebrow: string;
}) {
  const presentation = tonePresentation[summary.verdict.tone];
  const VerdictIcon = presentation.icon;

  return (
    <section
      aria-labelledby="executive-summary-title"
      className={cn(
        "overflow-hidden rounded-3xl border shadow-sm",
        presentation.border,
        presentation.surface,
      )}
    >
      <header className="border-border/70 grid gap-4 border-b px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="executive-summary-title"
            className="text-lg leading-tight font-semibold"
          >
            {priorityEyebrow}
          </h2>
          <Badge variant={presentation.badge}>
            <VerdictIcon aria-hidden="true" />
            {summary.verdict.toneLabel}
          </Badge>
        </div>
        <div className="grid max-w-3xl gap-1.5">
          <h3 className="text-xl leading-tight font-semibold">
            {summary.priority.label}
          </h3>
          <p className="text-foreground/86 text-base leading-7">
            {summary.priority.body}
          </p>
        </div>
      </header>

      <ol className="bg-background/65 divide-border divide-y px-5 sm:px-8">
        {summary.answers.map((answer, index) => (
          <li
            key={answer.key}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 py-5 sm:py-6"
          >
            <span
              aria-hidden="true"
              className="bg-primary/10 text-primary grid size-9 place-items-center rounded-xl text-base font-semibold"
            >
              {index + 1}
            </span>
            <div className="grid max-w-4xl gap-1.5">
              <h3 className="text-base leading-6 font-semibold">
                {answer.question}
              </h3>
              <p className="text-foreground/86 text-base leading-7">
                {answer.answer}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export { ReportExecutiveSummary };
