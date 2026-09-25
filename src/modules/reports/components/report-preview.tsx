import { AlertCircleIcon, ChartNoAxesCombinedIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { formatBasisPoints, formatCurrency } from "../formatters";
import { isDetailedReportSnapshot } from "../schemas/report-snapshot.schema";
import type { ReportSnapshot } from "../types";

function ReportPreview({
  snapshot,
  invalid,
}: {
  snapshot: ReportSnapshot;
  invalid: boolean;
}) {
  const detailed = isDetailedReportSnapshot(snapshot);
  const metrics = detailed
    ? ([
        ["Faturamento mensal", snapshot.results.monthlyGrossRevenueCents],
        ["Resultado mensal", snapshot.results.monthlyResultCents],
        ["Margem final", snapshot.results.finalMarginBasisPoints, "percentage"],
      ] as const)
    : ([
        ["Preço atual", snapshot.results.currentPriceCents],
        ["Resultado por venda", snapshot.results.unitProfitCents],
        ["Margem", snapshot.results.realMarginBasisPoints, "percentage"],
      ] as const);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <ChartNoAxesCombinedIcon aria-hidden="true" className="size-4" />
            Simulação em tempo real
          </div>
          <Badge variant={invalid ? "warning" : "success"}>
            {invalid ? "Revisão necessária" : "Atualizada"}
          </Badge>
        </div>
        {invalid ? (
          <p className="text-warning-foreground flex gap-2 text-sm leading-5">
            <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4" />
            Revise os campos destacados para atualizar esta simulação.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm leading-5">
            Os números mudam conforme você altera os dados.
          </p>
        )}
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {metrics.map(([label, value, format]) => (
          <div key={label} className="bg-muted/50 grid gap-1 rounded-xl p-3">
            <span className="text-muted-foreground text-xs font-medium">
              {label}
            </span>
            <strong className="text-base tabular-nums">
              {value === null
                ? "Ainda não calculado"
                : format === "percentage"
                  ? formatBasisPoints(value)
                  : formatCurrency(value)}
            </strong>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export { ReportPreview };
