import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { formatCurrency } from "../formatters";
import type { CurrentDetailedReportSnapshot } from "../types";

function DetailedItemBreakdown({
  snapshot,
}: {
  snapshot: CurrentDetailedReportSnapshot;
}) {
  const byId = new Map(snapshot.inputs.items.map((item) => [item.id, item]));
  const items = [...snapshot.results.items].sort((left, right) => {
    if (!snapshot.results.isPartial)
      return (
        (right.monthlyContributionCents ?? 0) -
        (left.monthlyContributionCents ?? 0)
      );
    return (
      (byId.get(left.itemId)?.position ?? 0) -
      (byId.get(right.itemId)?.position ?? 0)
    );
  });
  const amounts = items.map((item) =>
    snapshot.results.isPartial
      ? item.unitContributionCents
      : (item.monthlyContributionCents ?? 0),
  );
  const largest = Math.max(1, ...amounts.map((value) => Math.abs(value)));

  return (
    <section aria-labelledby="item-comparison-title" className="grid gap-3">
      <div className="grid gap-1 px-1">
        <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
          Comparação
        </p>
        <h2 id="item-comparison-title" className="text-2xl">
          O que cada item deixa para o negócio
        </h2>
        <p className="text-muted-foreground text-sm leading-6">
          {snapshot.results.isPartial
            ? "Como faltam volumes, a comparação usa o valor deixado por unidade."
            : "Os itens estão ordenados pela contribuição mensal para o mix."}
        </p>
      </div>
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="sr-only">Contribuição dos itens</CardHeader>
        <CardContent>
          <ul className="grid gap-5">
            {items.map((result) => {
              const input = byId.get(result.itemId);
              if (!input) return null;
              const amount = snapshot.results.isPartial
                ? result.unitContributionCents
                : (result.monthlyContributionCents ?? 0);
              const label = snapshot.results.isPartial
                ? "por unidade"
                : "no mês";
              return (
                <li key={result.itemId} className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-medium">{input.name}</span>
                    <span className="tabular-nums">
                      {formatCurrency(amount)} {label}
                    </span>
                  </div>
                  <div
                    role="img"
                    aria-label={`${input.name}: ${formatCurrency(amount)} ${label}; ${amount < 0 ? "valor negativo" : "valor positivo"}`}
                    className="bg-muted h-2.5 overflow-hidden rounded-full"
                  >
                    <div
                      className={`h-full rounded-full ${amount < 0 ? "bg-destructive" : "bg-primary"}`}
                      style={{
                        width: `${Math.max(4, (Math.abs(amount) / largest) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {amount < 0
                      ? "Este item reduz o resultado a cada venda."
                      : "Este item contribui positivamente para cobrir os gastos."}
                  </p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

export { DetailedItemBreakdown };
