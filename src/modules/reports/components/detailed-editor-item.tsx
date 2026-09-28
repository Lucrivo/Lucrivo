"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ConfirmRemovalButton } from "@/components/shared/confirm-removal-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IngredientCard } from "@/modules/detailed-diagnosis/components/ingredients/ingredient-card";
import { IngredientNameEntry } from "@/modules/detailed-diagnosis/components/ingredients/ingredient-name-entry";
import type {
  DetailedDiagnosisInput,
  DetailedProductionItemInput,
} from "@/modules/detailed-diagnosis/types";
import { MonthlyVolumeField } from "@/modules/quick-diagnosis/components/shared/business-fields";
import { ProductDirectCostField } from "@/modules/quick-diagnosis/components/shared/product-fields";
import {
  ProductionUnitCostField,
  UnitSalePriceField,
} from "@/modules/quick-diagnosis/components/shared/unit-value-fields";

import type { DetailedEditorItemSummary } from "../editor/detailed-editor-summary";
import { EditorField } from "./quick-report-editor-fields";

type DetailedReportItem = DetailedDiagnosisInput["items"][number];

type DetailedEditorItemProps = {
  item: DetailedReportItem;
  index: number;
  errors: Record<string, string[]>;
  summary: DetailedEditorItemSummary;
  canRemove: boolean;
  onChange: (field: string, value: unknown) => void;
  onRemove: () => void;
};

function DetailedEditorItem({
  item,
  index,
  errors,
  summary,
  canRemove,
  onChange,
  onRemove,
}: DetailedEditorItemProps) {
  const base = `items.${index}`;
  const badgeVariant =
    summary.status.tone === "positive"
      ? "success"
      : summary.status.tone === "critical"
        ? "destructive"
        : "warning";

  return (
    <AccordionItem
      value={item.id}
      className="border-border bg-card overflow-hidden rounded-xl border shadow-xs"
    >
      <div className="flex items-start gap-1 p-2 sm:items-center sm:gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <AccordionTrigger
                  aria-label={"Abrir " + summary.name}
                  className="min-h-14 min-w-0 px-2 hover:no-underline sm:px-3"
                />
              }
            >
              <span
                data-slot="detailed-editor-item-summary"
                className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(10rem,1fr)_auto_auto_auto] sm:items-center sm:gap-4"
              >
                <span
                  data-slot="detailed-editor-item-name"
                  className="truncate text-base font-semibold"
                >
                  {summary.name}
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:contents">
                  <span
                    data-slot="detailed-editor-item-sale"
                    className="text-muted-foreground font-normal whitespace-nowrap"
                  >
                    Venda{" "}
                    <strong className="text-foreground">
                      {summary.priceLabel}
                    </strong>
                  </span>
                  <span
                    data-slot="detailed-editor-item-cost"
                    className="text-muted-foreground font-normal whitespace-nowrap"
                  >
                    Custo{" "}
                    <strong className="text-foreground">
                      {summary.costLabel}
                    </strong>
                  </span>
                </span>
                <span data-slot="detailed-editor-item-status">
                  <Badge variant={badgeVariant}>
                    {summary.pendingCount > 0
                      ? summary.pendingCount +
                        " pendência" +
                        (summary.pendingCount > 1 ? "s" : "")
                      : summary.status.label}
                  </Badge>
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent role="tooltip">{summary.name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <ConfirmRemovalButton
          ariaLabel={"Remover " + summary.name}
          tooltip="Remover item"
          disabled={!canRemove}
          disabledReason="Mantenha pelo menos um item no diagnóstico."
          title={"Remover " + summary.name + "?"}
          description={
            "Os valores preenchidos para " +
            summary.name +
            " serão removidos deste diagnóstico."
          }
          confirmLabel="Remover item"
          onConfirm={onRemove}
        />
      </div>
      <AccordionContent className="border-border grid gap-5 border-t px-4 pt-5 pb-5 sm:px-5">
        <div className="grid gap-4 md:grid-cols-3">
          <EditorField
            id={`${base}.name`}
            label="Nome"
            inputMode="text"
            value={item.name}
            error={errors[`${base}.name`]}
            onChange={(value) => onChange("name", value)}
          />
          <UnitSalePriceField
            field={`${base}.unitSalePrice`}
            value={item.unitSalePrice}
            errors={errors}
            onChange={(value) => onChange("unitSalePrice", value)}
          />
          <MonthlyVolumeField
            field={`${base}.monthlySalesVolume`}
            value={item.monthlySalesVolume}
            errors={errors}
            onChange={(value) => onChange("monthlySalesVolume", value)}
          />
        </div>
        {item.kind !== "manufacturing" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ProductDirectCostField
              kind={item.kind}
              field={`${base}.purchaseUnitCost`}
              value={item.purchaseUnitCost}
              errors={errors}
              onChange={(value) => onChange("purchaseUnitCost", value)}
            />
            {item.kind === "resale" ? (
              <EditorField
                id={`${base}.packagingUnitCost`}
                label="Embalagem por unidade (R$)"
                value={item.packagingUnitCost}
                error={errors[`${base}.packagingUnitCost`]}
                onChange={(value) => onChange("packagingUnitCost", value)}
              />
            ) : null}
          </div>
        ) : (
          <ProductionItemFields
            item={item}
            base={base}
            errors={errors}
            onChange={onChange}
          />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function ProductionItemFields({
  item,
  base,
  errors,
  onChange,
}: {
  item: DetailedProductionItemInput;
  base: string;
  errors: Record<string, string[]>;
  onChange: (field: string, value: unknown) => void;
}) {
  const [pendingIngredientNameId, setPendingIngredientNameId] = useState<
    string | null
  >(null);

  function updateIngredient(
    ingredientId: string,
    field: string,
    value: string,
  ) {
    onChange(
      "ingredients",
      item.ingredients.map((ingredient) =>
        ingredient.id === ingredientId
          ? { ...ingredient, [field]: value }
          : ingredient,
      ),
    );
  }

  function addIngredient() {
    const id = crypto.randomUUID();
    onChange("ingredients", [
      ...item.ingredients,
      {
        id,
        name: `Ingrediente ${item.ingredients.length + 1}`,
        quantity: "",
        unit: "",
        unitCost: "",
      },
    ]);
    setPendingIngredientNameId(id);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 md:max-w-sm">
        <Label htmlFor={`${base}.costMode`}>Forma de informar o custo</Label>
        <select
          id={`${base}.costMode`}
          value={item.costMode}
          onChange={(event) => {
            const mode = event.target.value as "summarized" | "technical_sheet";
            onChange("costMode", mode);
            if (mode === "technical_sheet" && item.ingredients.length === 0) {
              const id = crypto.randomUUID();
              onChange("ingredients", [
                {
                  id,
                  name: "Ingrediente 1",
                  quantity: "",
                  unit: "",
                  unitCost: "",
                },
              ]);
              setPendingIngredientNameId(id);
            }
          }}
          className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/20 h-11 rounded-lg border px-3 text-base outline-none focus-visible:ring-3 md:text-sm"
        >
          <option value="summarized">Custo total por unidade</option>
          <option value="technical_sheet">Ficha técnica completa</option>
        </select>
      </div>
      {item.costMode === "summarized" ? (
        <div className="md:max-w-sm">
          <ProductionUnitCostField
            field={`${base}.productionUnitCost`}
            value={item.productionUnitCost}
            errors={errors}
            onChange={(value) => onChange("productionUnitCost", value)}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <EditorField
              id={`${base}.recipeYield`}
              label="Rendimento da receita"
              value={item.recipeYield}
              error={errors[`${base}.recipeYield`]}
              onChange={(value) => onChange("recipeYield", value)}
            />
            <EditorField
              id={`${base}.lossRate`}
              label="Perda de produção (%)"
              value={item.lossRate}
              error={errors[`${base}.lossRate`]}
              onChange={(value) => onChange("lossRate", value)}
            />
            {(
              [
                ["packagingUnitCost", "Embalagem por unidade (R$)"],
                ["directLaborUnitCost", "Mão de obra por unidade (R$)"],
                ["otherVariableUnitCost", "Outros custos por unidade (R$)"],
              ] as const
            ).map(([field, label]) => (
              <EditorField
                key={field}
                id={`${base}.${field}`}
                label={label}
                value={item[field]}
                error={errors[`${base}.${field}`]}
                onChange={(value) => onChange(field, value)}
              />
            ))}
          </div>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h5 className="font-semibold">Ingredientes</h5>
                <p className="text-muted-foreground text-sm">
                  Abra somente o ingrediente que deseja ajustar.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={addIngredient}>
                <PlusIcon aria-hidden="true" />
                Adicionar ingrediente
              </Button>
            </div>
            {errors[`${base}.ingredients`]?.[0] ? (
              <p
                id={`${base}.ingredients`}
                role="alert"
                tabIndex={-1}
                className="border-destructive/25 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm outline-none"
              >
                {errors[`${base}.ingredients`][0]}
              </p>
            ) : null}
            {item.ingredients.map((ingredient, ingredientIndex) => {
              const ingredientBase = `${base}.ingredients.${ingredientIndex}`;
              if (pendingIngredientNameId === ingredient.id) {
                return (
                  <IngredientNameEntry
                    key={ingredient.id}
                    id={ingredient.id}
                    value={ingredient.name}
                    error={errors[`${ingredientBase}.name`]?.[0]}
                    canCancel
                    onChange={(value) =>
                      updateIngredient(ingredient.id, "name", value)
                    }
                    onContinue={() => setPendingIngredientNameId(null)}
                    onCancel={() => {
                      if (item.ingredients.length > 1) {
                        onChange(
                          "ingredients",
                          item.ingredients.filter(
                            (candidate) => candidate.id !== ingredient.id,
                          ),
                        );
                        setPendingIngredientNameId(null);
                      } else {
                        updateIngredient(
                          ingredient.id,
                          "name",
                          "Ingrediente 1",
                        );
                      }
                    }}
                  />
                );
              }
              return (
                <IngredientCard
                  key={ingredient.id}
                  ingredient={ingredient}
                  basePath={ingredientBase}
                  errors={errors}
                  canRemove={item.ingredients.length > 1}
                  onChange={(field, value) =>
                    updateIngredient(ingredient.id, field, value)
                  }
                  onRemove={() =>
                    onChange(
                      "ingredients",
                      item.ingredients.filter(
                        (candidate) => candidate.id !== ingredient.id,
                      ),
                    )
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export { DetailedEditorItem, type DetailedEditorItemProps };
