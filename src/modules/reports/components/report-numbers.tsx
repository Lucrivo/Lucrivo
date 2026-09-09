import { PlainLanguageHelp } from "@/components/shared/plain-language-help";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ReportNumberViewModel } from "../presenters/to-report-view-model";

function ReportNumbers({
  numbers,
  title,
  description,
}: {
  numbers: ReportNumberViewModel[];
  title: string;
  description: string;
}) {
  return (
    <aside aria-label={title} className="lg:sticky lg:top-24">
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="border-b pb-4">
          <CardTitle>
            <h2 className="font-semibold">{title}</h2>
          </CardTitle>
          <p className="text-muted-foreground text-xs leading-5">
            {description}
          </p>
        </CardHeader>
        <CardContent>
          <dl className="divide-border grid divide-y">
            {numbers.map((number) => (
              <div
                key={number.key}
                className={cn(
                  "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-3 py-3 first:pt-0 last:pb-0",
                  number.key === "sales" && "py-5",
                )}
              >
                <dt className="text-muted-foreground grid gap-1 text-xs font-medium">
                  <span>{number.label}</span>
                  {number.help ? <PlainLanguageHelp {...number.help} /> : null}
                </dt>
                <dd
                  className={cn(
                    "max-w-full min-w-0 text-right font-semibold break-words tabular-nums",
                    number.key === "sales" && "text-primary text-xl",
                  )}
                >
                  {number.value}
                </dd>
                {number.supportingText ? (
                  <p className="text-muted-foreground col-span-2 text-xs leading-5">
                    {number.supportingText}
                  </p>
                ) : null}
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </aside>
  );
}

export { ReportNumbers };
