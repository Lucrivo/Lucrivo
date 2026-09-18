import { TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { formatBasisPoints, formatCurrency } from "../formatters";
import type { CurrentDetailedReportSnapshot } from "../types";

type DetailedInputItem =
  CurrentDetailedReportSnapshot["inputs"]["items"][number];
type DetailedResultItem =
  CurrentDetailedReportSnapshot["results"]["items"][number];

function DetailedItemCard({
  item,
  result,
}: {
  item: DetailedInputItem;
  result: DetailedResultItem;
}) {
  return (
    <Card className="border-border/70 overflow-hidden shadow-sm">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h3 className="text-xl">{item.name}</h3>
            <p className="text-muted-foreground text-sm">
              {item.monthlySalesVolume === null
                ? "Volume mensal pendente"
                : `${item.monthlySalesVolume} unidades no mês`}
            </p>
          </div>
          {result.directLoss ? (
            <Badge variant="destructive">
              <TriangleAlertIcon aria-hidden="true" />
              Perda por venda
            </Badge>
          ) : (
            <Badge variant="success">Contribuição positiva</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        {result.directLoss ? (
          <p className="border-destructive/25 bg-destructive/5 text-destructive rounded-xl border p-3 text-sm">
            O preço atual não cobre os custos variáveis e as taxas deste item.
          </p>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground text-xs">Preço de venda</dt>
            <dd className="font-semibold tabular-nums">
              {formatCurrency(item.unitSalePriceCents)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Custo variável</dt>
            <dd className="font-semibold tabular-nums">
              {formatCurrency(result.variableUnitCostCents)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Sobra por unidade</dt>
            <dd className="font-semibold tabular-nums">
              {formatCurrency(result.unitContributionCents)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              Margem de contribuição
            </dt>
            <dd className="font-semibold tabular-nums">
              {result.contributionMarginBasisPoints === null
                ? "Indisponível"
                : formatBasisPoints(result.contributionMarginBasisPoints)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              Preço de equilíbrio
            </dt>
            <dd className="font-semibold tabular-nums">
              {result.breakEvenUnitPriceCents === null
                ? "Indisponível"
                : formatCurrency(result.breakEvenUnitPriceCents)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              Piso para promoção
            </dt>
            <dd className="font-semibold tabular-nums">
              {result.promotionFloorCents === null
                ? "Indisponível"
                : formatCurrency(result.promotionFloorCents)}
            </dd>
          </div>
        </dl>

        {item.kind === "manufacturing" ? (
          <details className="border-border/70 rounded-xl border p-4">
            <summary className="cursor-pointer font-semibold">
              Detalhes da produção
            </summary>
            <div className="text-muted-foreground mt-4 grid gap-3 text-sm">
              {item.costMode === "summarized" ? (
                <p>
                  Custo total informado por unidade:{" "}
                  {formatCurrency(item.productionUnitCostCents)}
                </p>
              ) : (
                <>
                  <p>
                    Ficha técnica · rendimento de {item.recipeYield} unidades ·
                    perda de {formatBasisPoints(item.lossRateBasisPoints)}
                  </p>
                  <ul className="grid gap-2">
                    {item.ingredients.map((ingredient) => (
                      <li key={ingredient.id}>
                        {ingredient.name}:{" "}
                        {ingredient.quantityMillionths / 1_000_000}{" "}
                        {ingredient.unit} a{" "}
                        {formatCurrency(
                          Math.round(ingredient.unitCostTenThousandths / 100),
                        )}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Embalagem {formatCurrency(item.packagingUnitCostCents)} ·
                    mão de obra direta{" "}
                    {formatCurrency(item.directLaborUnitCostCents)} · outros
                    custos {formatCurrency(item.otherVariableUnitCostCents)}
                  </p>
                </>
              )}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { DetailedItemCard };
