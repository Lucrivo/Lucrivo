import { PlainLanguageHelp } from "@/components/shared/plain-language-help";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const featuredNumber = numbers[0]?.key === "sales" ? numbers[0] : null;
  const regularNumbers = featuredNumber ? numbers.slice(1) : numbers;

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
        <CardContent className="grid gap-4">
          {featuredNumber ? (
            <dl
              data-slot="featured-report-number"
              className="border-primary/20 bg-primary/5 grid min-w-0 gap-2 rounded-xl border px-4 py-4"
            >
              <dt className="text-foreground grid gap-1 text-sm font-medium">
                <span>{featuredNumber.label}</span>
                {featuredNumber.help ? (
                  <PlainLanguageHelp {...featuredNumber.help} />
                ) : null}
              </dt>
              <dd className="grid min-w-0 gap-2">
                <span className="text-primary text-2xl leading-tight font-semibold break-words tabular-nums">
                  {featuredNumber.value}
                </span>
                {featuredNumber.supportingText ? (
                  <span className="text-foreground/75 text-xs leading-5">
                    {featuredNumber.supportingText}
                  </span>
                ) : null}
              </dd>
            </dl>
          ) : null}

          <dl
            data-slot="report-number-list"
            className="divide-border grid divide-y"
          >
            {regularNumbers.map((number) => (
              <div
                key={number.key}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-3 py-3 first:pt-0 last:pb-0"
              >
                <dt className="text-muted-foreground grid gap-1 text-xs font-medium">
                  <span>{number.label}</span>
                  {number.help ? <PlainLanguageHelp {...number.help} /> : null}
                </dt>
                <dd className="max-w-full min-w-0 text-right font-semibold break-words tabular-nums">
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
