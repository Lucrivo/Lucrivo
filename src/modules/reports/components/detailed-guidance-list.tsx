import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { CurrentDetailedReportSnapshot } from "../types";

const toneStyles = {
  neutral: { className: "border-info/25 bg-info/5", icon: InfoIcon },
  positive: {
    className: "border-success/25 bg-success/5",
    icon: CircleCheckIcon,
  },
  warning: {
    className: "border-warning/30 bg-warning/5",
    icon: CircleAlertIcon,
  },
  critical: {
    className: "border-destructive/25 bg-destructive/5",
    icon: CircleAlertIcon,
  },
} as const;

function DetailedGuidanceList({
  guidance,
}: {
  guidance: CurrentDetailedReportSnapshot["guidance"];
}) {
  return (
    <section aria-labelledby="guidance-title" className="grid gap-3">
      <div className="grid gap-1 px-1">
        <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
          Próximos passos
        </p>
        <h2 id="guidance-title" className="text-2xl">
          Onde agir primeiro
        </h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {guidance.map((entry) => {
          const presentation = toneStyles[entry.tone];
          const Icon = presentation.icon;
          return (
            <Card key={entry.key} className={presentation.className}>
              <CardContent className="flex gap-3 py-1">
                <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div className="grid gap-1">
                  <h3 className="font-semibold">{entry.title}</h3>
                  <p className="text-muted-foreground text-sm leading-6">
                    {entry.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export { DetailedGuidanceList };
