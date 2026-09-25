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
import { DiscountSimulator } from "./discount-simulator";

function DetailedItemCard({ item }: { item: DetailedItemViewModel }) {
  return (
    <AccordionItem
      value={item.id}
      className="border-border bg-card data-open:border-primary/35 data-open:bg-primary/3 overflow-hidden rounded-xl border shadow-sm transition-[background-color,border-color,box-shadow] data-open:shadow-md"
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
          <span className="text-muted-foreground grid gap-0.5 font-normal">
            <span className="text-xs">Preço de venda</span>
            <strong className="text-foreground tabular-nums">
              {item.priceLabel}
            </strong>
          </span>
          <span className="text-muted-foreground grid gap-0.5 font-normal">
            <span className="text-xs">Quanto este item deixa no mês</span>
            <strong className="text-foreground tabular-nums">
              {item.monthlyContributionLabel}
            </strong>
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

      <AccordionContent className="border-border grid gap-6 border-t px-4 pt-5 pb-5 sm:px-5">
        {item.statusTone === "critical" ? (
          <p className="border-destructive/25 bg-destructive/5 text-destructive rounded-xl border p-3 text-sm">
            O preço atual não cobre o custo do item e as taxas desta venda.
          </p>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <section aria-labelledby={`${item.id}-sale`} className="grid gap-3">
            <h4 id={`${item.id}-sale`} className="text-base font-semibold">
              Venda
            </h4>
            <dl className="border-border/70 divide-border bg-background/70 grid divide-y rounded-xl border px-4">
              <div className="flex items-end justify-between gap-4 py-3">
                <dt className="text-muted-foreground">Preço</dt>
                <dd className="font-semibold tabular-nums">
                  {item.priceLabel}
                </dd>
              </div>
              <div className="flex items-end justify-between gap-4 py-3">
                <dt className="text-muted-foreground">
                  Depois de impostos e cartão
                </dt>
                <dd className="font-semibold tabular-nums">
                  {item.netRevenueLabel}
                </dd>
              </div>
              <div className="flex items-end justify-between gap-4 py-3">
                <dt className="text-muted-foreground">
                  Valor deixado por venda
                </dt>
                <dd className="font-semibold tabular-nums">
                  {item.unitContributionLabel}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby={`${item.id}-costs`} className="grid gap-3">
            <h4 id={`${item.id}-costs`} className="text-base font-semibold">
              Gastos desta venda
            </h4>
            <dl className="border-border/70 divide-border bg-background/70 grid divide-y rounded-xl border px-4">
              <div className="flex items-end justify-between gap-4 py-3">
                <dt className="text-muted-foreground">Custo do item</dt>
                <dd className="font-semibold tabular-nums">
                  {item.variableCostLabel}
                </dd>
              </div>
              <div className="flex items-end justify-between gap-4 py-3">
                <dt className="text-muted-foreground">Impostos e cartão</dt>
                <dd className="font-semibold tabular-nums">{item.feeLabel}</dd>
              </div>
              <div className="grid gap-1 py-3">
                <dt className="text-muted-foreground">
                  Percentual que sobra da venda
                </dt>
                <dd className="font-semibold tabular-nums">
                  {item.marginLabel}
                </dd>
                <PlainLanguageHelp {...surplusHelp} />
              </div>
            </dl>
          </section>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="border-border/70 bg-background/70 grid gap-1 rounded-xl border p-4">
            <dt className="text-muted-foreground text-sm">
              Menor preço sem prejuízo na venda
            </dt>
            <dd className="text-lg font-semibold tabular-nums">
              {item.breakEvenLabel}
            </dd>
            {item.breakEvenUnavailableReason ? (
              <p className="text-muted-foreground text-xs">
                {item.breakEvenUnavailableReason}
              </p>
            ) : null}
          </div>
          <div className="border-border/70 bg-background/70 grid gap-1 rounded-xl border p-4">
            <dt className="text-muted-foreground text-sm">
              Quanto este item deixa no mês
            </dt>
            <dd className="text-lg font-semibold tabular-nums">
              {item.monthlyContributionLabel}
            </dd>
          </div>
        </dl>

        <DiscountSimulator
          base={item.discountSimulationBase}
          context={{
            category: item.category,
            mode: "detailed_item_attention",
          }}
        />

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
