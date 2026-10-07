import { InfoIcon, TriangleAlertIcon } from "lucide-react";

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

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-4 py-3">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="max-w-full min-w-0 text-right font-semibold break-words tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function DetailedItemCard({ item }: { item: DetailedItemViewModel }) {
  return (
    <AccordionItem
      value={item.id}
      className="border-border bg-card data-open:border-primary/35 data-open:bg-primary/3 overflow-hidden rounded-xl border shadow-sm transition-[background-color,border-color,box-shadow] data-open:shadow-md"
    >
      <AccordionTrigger
        aria-label={`Abrir detalhes de ${item.name}`}
        className="min-h-16 min-w-0 gap-4 px-4 py-4 hover:no-underline sm:px-5"
      >
        <span className="grid min-w-0 flex-1 gap-3 text-left @3xl/page:grid-cols-[minmax(0,1fr)_auto_auto_auto] @3xl/page:items-center">
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
            <span className="text-xs">Valor que ajuda a pagar o mês</span>
            <strong className="text-foreground tabular-nums">
              {item.monthlyContributionLabel}
            </strong>
          </span>
          <Badge
            variant={item.statusTone === "critical" ? "destructive" : "success"}
            className="h-auto max-w-full justify-self-start whitespace-normal @3xl/page:justify-self-end"
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
            O preço atual não cobre o custo da unidade e as cobranças desta
            venda.
          </p>
        ) : null}

        {item.breakEvenReferenceLabel ? (
          <p className="border-info/25 bg-info/8 text-foreground flex items-start gap-2 rounded-xl border p-3 text-sm leading-5">
            <InfoIcon
              aria-hidden="true"
              className="text-info mt-0.5 size-4 shrink-0"
            />
            {item.breakEvenReferenceLabel}
          </p>
        ) : null}

        {item.completeCostUnavailableReason ? (
          <p className="border-info/25 bg-info/8 text-foreground flex items-start gap-2 rounded-xl border p-3 text-sm leading-5">
            <InfoIcon
              aria-hidden="true"
              className="text-info mt-0.5 size-4 shrink-0"
            />
            {item.completeCostUnavailableReason}
          </p>
        ) : null}

        <div className="grid min-w-0 gap-5 @3xl/page:grid-cols-2">
          <section aria-labelledby={`${item.id}-sale`} className="grid gap-3">
            <h4 id={`${item.id}-sale`} className="text-base font-semibold">
              Venda e resultado
            </h4>
            <dl className="border-border/70 divide-border bg-background/70 grid divide-y rounded-xl border px-4">
              <ValueRow label="Preço" value={item.priceLabel} />
              <ValueRow
                label="Valor depois de impostos e cartão"
                value={item.netRevenueLabel}
              />
              <ValueRow
                label="Resultado por venda"
                value={item.unitProfitLabel}
              />
              <ValueRow
                label="Quanto sobra a cada R$ 100"
                value={item.realMarginLabel}
              />
            </dl>
          </section>

          <section aria-labelledby={`${item.id}-costs`} className="grid gap-3">
            <h4 id={`${item.id}-costs`} className="text-base font-semibold">
              Composição do custo
            </h4>
            <dl className="border-border/70 divide-border bg-background/70 grid divide-y rounded-xl border px-4">
              <ValueRow
                label="Quanto esta unidade custa"
                value={item.variableCostLabel}
              />
              <ValueRow label="Impostos e cartão" value={item.feeLabel} />
              <ValueRow
                label="Parte dos gastos do mês"
                value={item.fixedAllocationLabel}
              />
              <ValueRow
                label="Custo completo por unidade"
                value={item.totalUnitCostLabel}
              />
            </dl>
          </section>
        </div>

        <dl className="grid min-w-0 gap-4 @xl/page:grid-cols-2">
          <div className="border-border/70 bg-background/70 grid min-w-0 gap-1 rounded-xl border p-4">
            <dt className="text-muted-foreground text-sm">
              Menor preço para não ficar no prejuízo
            </dt>
            <dd className="text-lg font-semibold break-words tabular-nums">
              {item.breakEvenLabel}
            </dd>
            {item.breakEvenUnavailableReason ? (
              <p className="text-muted-foreground text-xs leading-5">
                {item.breakEvenUnavailableReason}
              </p>
            ) : null}
          </div>
          <div className="border-border/70 bg-background/70 grid min-w-0 gap-1 rounded-xl border p-4">
            <dt className="text-muted-foreground text-sm">
              Valor deixado pelas vendas para pagar o mês
            </dt>
            <dd className="text-lg font-semibold break-words tabular-nums">
              {item.monthlyContributionLabel}
            </dd>
            <PlainLanguageHelp {...surplusHelp} />
          </div>
        </dl>

        <DiscountSimulator
          base={item.discountSimulationBase}
          context={{ category: item.category }}
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
