import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ReportNumberViewModel } from "../presenters/to-report-view-model";

function ReportNumbers({ numbers }: { numbers: ReportNumberViewModel[] }) {
  return (
    <aside aria-label="Seus números" className="lg:sticky lg:top-24">
      <Card className="border-border/70 shadow-xs">
        <CardHeader className="border-b pb-4">
          <CardTitle>
            <h2 className="font-semibold">Seus números</h2>
          </CardTitle>
          <p className="text-muted-foreground text-xs leading-5">
            Referências financeiras deste diagnóstico.
          </p>
        </CardHeader>
        <CardContent>
          <dl className="divide-border grid divide-y">
            {numbers.map((number) => (
              <div
                key={number.key}
                className="flex items-end justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <dt className="text-muted-foreground text-xs font-medium">
                  {number.label}
                </dt>
                <dd className="font-semibold tabular-nums">{number.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </aside>
  );
}

export { ReportNumbers };
