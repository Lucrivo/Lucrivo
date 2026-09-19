import { TriangleAlertIcon } from "lucide-react";

import { PlainLanguageHelp } from "@/components/shared/plain-language-help";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

import {
  surplusHelp,
  type DetailedItemViewModel,
} from "../presenters/to-detailed-report-view-model";

function DetailedItemCard({ item }: { item: DetailedItemViewModel }) {
  return (
    <AccordionItem
      value={item.id}
      className="border-border bg-card overflow-hidden rounded-xl border shadow-sm"
    >
      <AccordionTrigger
        aria-label={`Abrir detalhes de ${item.name}`}
        className="min-h-16 gap-4 px-4 py-4 hover:no-underline sm:px-5"
      >
        <span className="grid min-w-0 flex-1 gap-3 text-left md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
          <span className="grid min-w-0 gap-1">
            <span className="truncate text-lg font-semibold">{item.name}</span>
            <span className="text-muted-foreground font-normal">
              {item.volumeLabel}
            </span>
          </span>
          <span className="text-muted-foreground font-normal">
            Venda <strong className="text-foreground">{item.priceLabel}</strong>
          </span>
          <span className="text-muted-foreground font-normal">
            Custo <strong className="text-foreground">{item.costLabel}</strong>
          </span>
          <Badge
            variant={item.statusTone === "critical" ? "destructive" : "success"}
          >
            {item.statusTone === "critical" ? (
              <TriangleAlertIcon aria-hidden="true" />
            ) : null}
            {item.statusLabel}
          </Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent className="border-border grid gap-5 border-t px-4 pt-5 pb-5 sm:px-5">
        {item.statusTone === "critical" ? (
          <p className="border-destructive/25 bg-destructive/5 text-destructive rounded-xl border p-3 text-sm">
            O preço atual não cobre o custo do item e as taxas desta venda.
          </p>
        ) : null}

        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-1">
            <dt className="text-muted-foreground text-sm">Sobra por venda</dt>
            <dd className="font-semibold tabular-nums">{item.surplusLabel}</dd>
            <PlainLanguageHelp {...surplusHelp} />
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground text-sm">
              Percentual que sobra da venda
            </dt>
            <dd className="font-semibold tabular-nums">{item.marginLabel}</dd>
            <PlainLanguageHelp
              title="O que este percentual mostra?"
              description="Mostra quanto do preço fica disponível para pagar os gastos do mês depois do custo do item e das taxas."
              technicalTerm="margem de contribuição"
            />
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground text-sm">
              Menor preço sem prejuízo na venda
            </dt>
            <dd className="font-semibold tabular-nums">
              {item.breakEvenLabel}
            </dd>
            {item.breakEvenUnavailableReason ? (
              <p className="text-muted-foreground text-xs">
                {item.breakEvenUnavailableReason}
              </p>
            ) : null}
          </div>
          <div className="grid gap-1">
            <dt className="text-muted-foreground text-sm">
              Menor preço para promoção planejada
            </dt>
            <dd className="font-semibold tabular-nums">
              {item.promotionFloorLabel}
            </dd>
            {item.promotionFloorUnavailableReason ? (
              <p className="text-muted-foreground text-xs">
                {item.promotionFloorUnavailableReason}
              </p>
            ) : null}
          </div>
        </dl>

        {item.technicalDetails ? (
          <details className="border-border/70 rounded-xl border p-4">
            <summary className="cursor-pointer font-semibold">
              Ver memória de cálculo da produção
            </summary>
            <div className="text-muted-foreground mt-4 grid gap-3 text-sm">
              <p>{item.technicalDetails.modeLabel}</p>
              {item.technicalDetails.yieldAndLossLabel ? (
                <p>{item.technicalDetails.yieldAndLossLabel}</p>
              ) : null}
              {item.technicalDetails.ingredients.length > 0 ? (
                <ul className="grid gap-2">
                  {item.technicalDetails.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>
                      <strong className="text-foreground">
                        {ingredient.name}
                      </strong>
                      {": "}
                      {ingredient.quantityLabel} · compra por{" "}
                      {ingredient.unitCostLabel}
                    </li>
                  ))}
                </ul>
              ) : null}
              {item.technicalDetails.additionalCostsLabel ? (
                <p>{item.technicalDetails.additionalCostsLabel}</p>
              ) : null}
            </div>
          </details>
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
}

export { DetailedItemCard };
