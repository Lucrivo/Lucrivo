import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { formatBasisPoints, formatCurrency } from "../formatters";
import type { CurrentDetailedReportSnapshot } from "../types";

const verdictLabels: Record<
  CurrentDetailedReportSnapshot["results"]["verdict"],
  string
> = {
  direct_loss: "Há itens com perda por venda",
  incomplete_volume: "Faltam volumes para concluir",
  no_sales: "O mês está sem vendas",
  operational_loss: "As vendas não cobrem os gastos",
  break_even: "O negócio está no ponto de equilíbrio",
  tight_margin: "O resultado tem pouca folga",
  adequate_margin: "O mix cobre os gastos com folga",
};

function optionalCurrency(value: number | null): string {
  return value === null ? "Indisponível" : formatCurrency(value);
}

function optionalMargin(value: number | null): string {
  return value === null ? "Indisponível" : formatBasisPoints(value);
}

function DetailedBusinessSummary({
  snapshot,
}: {
  snapshot: CurrentDetailedReportSnapshot;
}) {
  const { results } = snapshot;
  const missingNames = snapshot.inputs.items
    .filter((item) => results.missingVolumeItemIds.includes(item.id))
    .map((item) => item.name);
  const positive =
    results.monthlyResultCents !== null && results.monthlyResultCents > 0;

  return (
    <section aria-labelledby="detailed-conclusion" className="grid gap-4">
      <Card className="border-primary/20 bg-primary/3 overflow-hidden shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
              Conclusão do diagnóstico
            </p>
            <Badge
              variant={
                results.isPartial ? "info" : positive ? "success" : "warning"
              }
            >
              {results.isPartial ? (
                <InfoIcon aria-hidden="true" />
              ) : positive ? (
                <CircleCheckIcon aria-hidden="true" />
              ) : (
                <CircleAlertIcon aria-hidden="true" />
              )}
              {results.isPartial ? "Análise parcial" : "Análise completa"}
            </Badge>
          </div>
          <h2 id="detailed-conclusion" className="text-2xl sm:text-3xl">
            {verdictLabels[results.verdict]}
          </h2>
          {results.isPartial ? (
            <p className="text-muted-foreground max-w-3xl leading-6">
              Informe o volume mensal de {missingNames.join(", ")} para calcular
              o resultado do mix. Os valores por unidade continuam disponíveis.
            </p>
          ) : (
            <p className="text-muted-foreground max-w-3xl leading-6">
              O resultado considera todos os itens, taxas e gastos mensais
              informados neste diagnóstico.
            </p>
          )}
        </CardHeader>
      </Card>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Faturamento mensal",
            optionalCurrency(results.monthlyGrossRevenueCents),
          ],
          ["Resultado mensal", optionalCurrency(results.monthlyResultCents)],
          ["Margem final", optionalMargin(results.finalMarginBasisPoints)],
          [
            "Faturamento de equilíbrio",
            optionalCurrency(results.breakEvenRevenueCents),
          ],
        ].map(([label, value]) => (
          <Card key={label} className="border-border/70 shadow-xs">
            <CardContent className="grid gap-1.5 py-1">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="text-lg font-semibold tracking-tight tabular-nums">
                {value}
              </dd>
            </CardContent>
          </Card>
        ))}
      </dl>
    </section>
  );
}

export { DetailedBusinessSummary };
