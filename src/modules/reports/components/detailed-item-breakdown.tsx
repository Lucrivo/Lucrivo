import { Card, CardContent, CardHeader } from "@/components/ui/card";

import type { DetailedComparisonEntryViewModel } from "../presenters/to-detailed-report-view-model";

function DetailedItemBreakdown({
  comparison,
}: {
  comparison: DetailedComparisonEntryViewModel[];
}) {
  const largest = Math.max(
    1,
    ...comparison.map((entry) => Math.abs(entry.amountCents)),
  );
  const contextLabel = comparison[0]?.contextLabel ?? "por unidade";

  return (
    <section aria-labelledby="item-comparison-title" className="grid gap-3">
      <div className="grid gap-1 px-1">
        <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
          Comparação
        </p>
        <h2 id="item-comparison-title" className="text-2xl">
          Quais itens ajudam ou prejudicam o resultado?
        </h2>
        <p className="text-muted-foreground text-sm leading-6">
          {contextLabel === "por unidade"
            ? "Sobra por unidade. Complete as vendas mensais para comparar o impacto no mês."
            : "Resultado no mês, considerando quanto cada item vendeu."}
        </p>
      </div>
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="sr-only">Comparação dos itens</CardHeader>
        <CardContent>
          <ul className="grid gap-5">
            {comparison.map((entry) => (
              <li key={entry.id} className="grid gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">{entry.name}</span>
                  <span className="tabular-nums">
                    {entry.amountLabel} {entry.contextLabel}
                  </span>
                </div>
                <div
                  role="img"
                  aria-label={`${entry.name}: ${entry.amountLabel} ${entry.contextLabel}; ${entry.statusLabel}`}
                  className="bg-muted h-2.5 overflow-hidden rounded-full"
                >
                  <div
                    className={`h-full rounded-full ${entry.tone === "critical" ? "bg-destructive" : "bg-primary"}`}
                    style={{
                      width: `${Math.max(4, (Math.abs(entry.amountCents) / largest) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {entry.statusLabel}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

export { DetailedItemBreakdown };
