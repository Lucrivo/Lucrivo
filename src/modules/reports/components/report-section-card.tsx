import {
  CircleCheckIcon,
  CircleHelpIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ReportSectionViewModel } from "../presenters/to-report-view-model";

const tonePresentation = {
  neutral: {
    icon: CircleHelpIcon,
    badge: "info" as const,
    border: "border-l-info",
    surface: "bg-info/4",
  },
  positive: {
    icon: CircleCheckIcon,
    badge: "success" as const,
    border: "border-l-success",
    surface: "bg-success/4",
  },
  warning: {
    icon: TriangleAlertIcon,
    badge: "warning" as const,
    border: "border-l-warning",
    surface: "bg-warning/5",
  },
  critical: {
    icon: OctagonAlertIcon,
    badge: "destructive" as const,
    border: "border-l-destructive",
    surface: "bg-destructive/4",
  },
};

function ReportSectionCard({ section }: { section: ReportSectionViewModel }) {
  const presentation = tonePresentation[section.tone];
  const ToneIcon = presentation.icon;

  return (
    <Card
      data-testid="report-section"
      className={cn(
        "relative border-l-4 py-0 shadow-xs",
        presentation.border,
        presentation.surface,
      )}
    >
      <CardHeader className="gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="max-w-2xl text-lg font-semibold sm:text-xl">
            {section.title}
          </h3>
          <Badge variant={presentation.badge}>
            <ToneIcon aria-label={section.toneLabel} />
            {section.toneLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <p className="text-foreground/86 max-w-3xl text-[0.9375rem] leading-7">
          {section.body}
        </p>
        {section.emphasisLabel && section.emphasisValue ? (
          <dl className="border-border/70 bg-background/75 grid w-fit min-w-48 gap-1 rounded-xl border px-4 py-3 shadow-xs">
            <dt className="text-muted-foreground text-xs font-medium">
              {section.emphasisLabel}
            </dt>
            <dd className="text-lg font-semibold tracking-tight tabular-nums">
              {section.emphasisValue}
            </dd>
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { ReportSectionCard };
