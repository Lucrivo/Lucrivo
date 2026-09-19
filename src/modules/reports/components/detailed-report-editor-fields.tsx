"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  DetailedDiagnosisInput,
  DetailedProductionItemInput,
} from "@/modules/detailed-diagnosis/types";

import type { EditableReportDraft } from "../editor/report-editor.types";
import { EditorField } from "./quick-report-editor-fields";

type DetailedDraft = Extract<EditableReportDraft, { kind: "detailed" }>;

function newItem(category: DetailedDiagnosisInput["category"]) {
  const common = {
    id: crypto.randomUUID(),
    name: "",
    unitSalePrice: "",
    monthlySalesVolume: "",
  };
  return category === "product"
    ? {
        ...common,
        kind: "resale" as const,
        purchaseUnitCost: "",
        packagingUnitCost: "",
      }
    : {
        ...common,
        kind: "manufacturing" as const,
        costMode: "summarized" as const,
        productionUnitCost: "",
        recipeYield: "",
        lossRate: "0",
        packagingUnitCost: "",
        directLaborUnitCost: "",
        otherVariableUnitCost: "",
        ingredients: [],
      };
}

function DetailedReportEditorFields({
  draft,
  errors,
  onChange,
}: {
  draft: DetailedDraft;
  errors: Record<string, string[]>;
  onChange: (draft: DetailedDraft) => void;
}) {
  const values = draft.values;
  const changeValues = (next: DetailedDiagnosisInput) =>
    onChange({ ...draft, values: next });
  const updateRoot = (field: keyof DetailedDiagnosisInput, value: unknown) =>
    changeValues({ ...values, [field]: value } as DetailedDiagnosisInput);
  const updateItem = (index: number, field: string, value: unknown) => {
    const items = values.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ) as DetailedDiagnosisInput["items"];
    updateRoot("items", items);
  };
  const removeItem = (index: number) =>
    updateRoot(
      "items",
      values.items.filter((_, itemIndex) => itemIndex !== index),
    );

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <EditorField
          id="fixedMonthlyExpenses"
          label="Gastos fixos mensais (R$)"
          value={values.fixedMonthlyExpenses}
          error={errors.fixedMonthlyExpenses}
          onChange={(value) => updateRoot("fixedMonthlyExpenses", value)}
        />
        <EditorField
          id="proLabore"
          label="Pró-labore mensal (R$)"
          value={values.proLabore}
          error={errors.proLabore}
          onChange={(value) =>
            changeValues({
              ...values,
              proLabore: value,
              proLaboreIncluded: value.trim() !== "",
            })
          }
        />
        <EditorField
          id="taxRate"
          label="Impostos (%)"
          value={values.taxRate}
          error={errors.taxRate}
          onChange={(value) => updateRoot("taxRate", value)}
        />
        <EditorField
          id="cardFeeRate"
          label="Cartão ou plataforma (%)"
          value={values.cardFeeRate}
          error={errors.cardFeeRate}
          onChange={(value) => updateRoot("cardFeeRate", value)}
        />
        <EditorField
          id="promotionMarginRate"
          label="Margem mínima para promoção (%)"
          value={values.promotionMarginRate}
          error={errors.promotionMarginRate}
          onChange={(value) => updateRoot("promotionMarginRate", value)}
        />
      </div>

      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Itens do diagnóstico</h3>
            <p className="text-muted-foreground text-sm">
              Edite preços, custos e volumes de cada item.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              updateRoot("items", [...values.items, newItem(values.category)])
            }
          >
            <PlusIcon aria-hidden="true" />
            Adicionar item
          </Button>
        </div>

        {values.items.map((item, index) => {
          const base = `items.${index}`;
          return (
            <section
              key={item.id}
              aria-labelledby={`item-${item.id}-title`}
              className="border-border grid gap-4 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h4 id={`item-${item.id}-title`} className="font-semibold">
                  Item {index + 1}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={values.items.length === 1}
                  onClick={() => removeItem(index)}
                >
                  <Trash2Icon aria-hidden="true" />
                  Remover
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <EditorField
                  id={`${base}.name`}
                  label="Nome"
                  inputMode="text"
                  value={item.name}
                  error={errors[`${base}.name`]}
                  onChange={(value) => updateItem(index, "name", value)}
                />
                <EditorField
                  id={`${base}.unitSalePrice`}
                  label="Preço de venda (R$)"
                  value={item.unitSalePrice}
                  error={errors[`${base}.unitSalePrice`]}
                  onChange={(value) =>
                    updateItem(index, "unitSalePrice", value)
                  }
                />
                <EditorField
                  id={`${base}.monthlySalesVolume`}
                  label="Vendas por mês"
                  inputMode="numeric"
                  value={item.monthlySalesVolume}
                  error={errors[`${base}.monthlySalesVolume`]}
                  onChange={(value) =>
                    updateItem(index, "monthlySalesVolume", value)
                  }
                />
                {item.kind === "resale" ? (
                  <>
                    <EditorField
                      id={`${base}.purchaseUnitCost`}
                      label="Custo de compra (R$)"
                      value={item.purchaseUnitCost}
                      error={errors[`${base}.purchaseUnitCost`]}
                      onChange={(value) =>
                        updateItem(index, "purchaseUnitCost", value)
                      }
                    />
                    <EditorField
                      id={`${base}.packagingUnitCost`}
                      label="Embalagem por unidade (R$)"
                      value={item.packagingUnitCost}
                      error={errors[`${base}.packagingUnitCost`]}
                      onChange={(value) =>
                        updateItem(index, "packagingUnitCost", value)
                      }
                    />
                  </>
                ) : (
                  <ProductionItemFields
                    item={item}
                    index={index}
                    errors={errors}
                    updateItem={updateItem}
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ProductionItemFields({
  item,
  index,
  errors,
  updateItem,
}: {
  item: DetailedProductionItemInput;
  index: number;
  errors: Record<string, string[]>;
  updateItem: (index: number, field: string, value: unknown) => void;
}) {
  const base = `items.${index}`;
  const updateIngredient = (
    ingredientIndex: number,
    field: string,
    value: string,
  ) =>
    updateItem(
      index,
      "ingredients",
      item.ingredients.map((ingredient, currentIndex) =>
        currentIndex === ingredientIndex
          ? { ...ingredient, [field]: value }
          : ingredient,
      ),
    );

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`${base}.costMode`}>Forma de informar o custo</Label>
        <select
          id={`${base}.costMode`}
          value={item.costMode}
          onChange={(event) => {
            const mode = event.target.value as "summarized" | "technical_sheet";
            updateItem(index, "costMode", mode);
            if (mode === "technical_sheet" && item.ingredients.length === 0)
              updateItem(index, "ingredients", [
                {
                  id: crypto.randomUUID(),
                  name: "",
                  quantity: "",
                  unit: "",
                  unitCost: "",
                },
              ]);
          }}
          className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/20 h-10 rounded-lg border px-3 text-base outline-none focus-visible:ring-3 md:text-sm"
        >
          <option value="summarized">Custo total por unidade</option>
          <option value="technical_sheet">Ficha técnica</option>
        </select>
      </div>
      {item.costMode === "summarized" ? (
        <EditorField
          id={`${base}.productionUnitCost`}
          label="Custo de fabricação (R$)"
          value={item.productionUnitCost}
          error={errors[`${base}.productionUnitCost`]}
          onChange={(value) => updateItem(index, "productionUnitCost", value)}
        />
      ) : (
        <div className="grid gap-4 sm:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <EditorField
              id={`${base}.recipeYield`}
              label="Rendimento da receita"
              value={item.recipeYield}
              error={errors[`${base}.recipeYield`]}
              onChange={(value) => updateItem(index, "recipeYield", value)}
            />
            <EditorField
              id={`${base}.lossRate`}
              label="Perda de produção (%)"
              value={item.lossRate}
              error={errors[`${base}.lossRate`]}
              onChange={(value) => updateItem(index, "lossRate", value)}
            />
            {[
              ["packagingUnitCost", "Embalagem por unidade (R$)"],
              ["directLaborUnitCost", "Mão de obra por unidade (R$)"],
              ["otherVariableUnitCost", "Outros custos por unidade (R$)"],
            ].map(([field, label]) => (
              <EditorField
                key={field}
                id={`${base}.${field}`}
                label={label!}
                value={
                  item[field as keyof DetailedProductionItemInput] as string
                }
                error={errors[`${base}.${field}`]}
                onChange={(value) => updateItem(index, field!, value)}
              />
            ))}
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h5 className="font-medium">Ingredientes</h5>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateItem(index, "ingredients", [
                    ...item.ingredients,
                    {
                      id: crypto.randomUUID(),
                      name: "",
                      quantity: "",
                      unit: "",
                      unitCost: "",
                    },
                  ])
                }
              >
                <PlusIcon aria-hidden="true" />
                Ingrediente
              </Button>
            </div>
            {item.ingredients.map((ingredient, ingredientIndex) => {
              const ingredientBase = `${base}.ingredients.${ingredientIndex}`;
              return (
                <div
                  key={ingredient.id}
                  className="bg-muted/40 grid gap-3 rounded-lg p-3 sm:grid-cols-2"
                >
                  <EditorField
                    id={`${ingredientBase}.name`}
                    label="Ingrediente"
                    inputMode="text"
                    value={ingredient.name}
                    error={errors[`${ingredientBase}.name`]}
                    onChange={(value) =>
                      updateIngredient(ingredientIndex, "name", value)
                    }
                  />
                  <EditorField
                    id={`${ingredientBase}.quantity`}
                    label="Quantidade"
                    value={ingredient.quantity}
                    error={errors[`${ingredientBase}.quantity`]}
                    onChange={(value) =>
                      updateIngredient(ingredientIndex, "quantity", value)
                    }
                  />
                  <EditorField
                    id={`${ingredientBase}.unit`}
                    label="Unidade"
                    inputMode="text"
                    value={ingredient.unit}
                    error={errors[`${ingredientBase}.unit`]}
                    onChange={(value) =>
                      updateIngredient(ingredientIndex, "unit", value)
                    }
                  />
                  <EditorField
                    id={`${ingredientBase}.unitCost`}
                    label="Custo por unidade (R$)"
                    value={ingredient.unitCost}
                    error={errors[`${ingredientBase}.unitCost`]}
                    onChange={(value) =>
                      updateIngredient(ingredientIndex, "unitCost", value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={item.ingredients.length === 1}
                    onClick={() =>
                      updateItem(
                        index,
                        "ingredients",
                        item.ingredients.filter(
                          (_, currentIndex) => currentIndex !== ingredientIndex,
                        ),
                      )
                    }
                  >
                    <Trash2Icon aria-hidden="true" />
                    Remover ingrediente
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export { DetailedReportEditorFields };
