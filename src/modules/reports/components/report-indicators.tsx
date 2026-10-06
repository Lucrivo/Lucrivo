import { PlainLanguageHelp } from "@/components/shared/plain-language-help";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ReportIndicatorViewModel } from "../presenters/to-report-view-model";
import { tonePresentation } from "./report-tone";

function ReportIndicatorCard({
  indicator,
}: {
  indicator: ReportIndicatorViewModel;
}) {
  const presentation = tonePresentation[indicator.tone];
  const ToneIcon = presentation.icon;

  return (
    <Card
      data-testid="report-indicator"
      data-indicator-key={indicator.key}
      data-featured={indicator.featured ? "true" : undefined}
      className={cn(
        "relative min-w-0 py-0 shadow-xs",
        presentation.border,
        presentation.surface,
        indicator.featured && "sm:col-span-2",
      )}
    >
      <CardHeader className="gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <h3 className="text-sm font-medium">{indicator.label}</h3>
            {indicator.help ? <PlainLanguageHelp {...indicator.help} /> : null}
          </div>
          <Badge variant={presentation.badge}>
            <ToneIcon aria-label={indicator.toneLabel} />
            {indicator.toneLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
        <p
          className={cn(
            "text-2xl leading-tight font-semibold wrap-break-word tabular-nums sm:text-3xl",
            presentation.value,
          )}
        >
          {indicator.value}
        </p>
        {indicator.supportingText ? (
          <p className="text-foreground/80 text-sm leading-6">
            {indicator.supportingText}
          </p>
        ) : null}
        {indicator.description ? (
          <p className="text-muted-foreground text-sm leading-6">
            {indicator.description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReportIndicators({
  indicators,
}: {
  indicators: ReportIndicatorViewModel[];
}) {
  const featured = indicators.filter((indicator) => indicator.featured);
  const regular = indicators.filter((indicator) => !indicator.featured);

  return (
    <div
      data-testid="report-indicators"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {featured.map((indicator) => (
        <ReportIndicatorCard key={indicator.key} indicator={indicator} />
      ))}
      {regular.map((indicator) => (
        <ReportIndicatorCard key={indicator.key} indicator={indicator} />
      ))}
    </div>
  );
}

export { ReportIndicatorCard, ReportIndicators };
