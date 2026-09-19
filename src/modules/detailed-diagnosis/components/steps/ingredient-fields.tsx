import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";
import type { DetailedProductionItemInput } from "../../types";

import type { DetailedStepProps } from "./types";

type IngredientFieldsProps = DetailedStepProps & {
  item: DetailedProductionItemInput;
  itemIndex: number;
};

function IngredientFields({
  state,
  dispatch,
  item,
  itemIndex,
}: IngredientFieldsProps) {
  const collectionPath = `items.${itemIndex}.ingredients`;
  const collectionError = state.fieldErrors[collectionPath]?.[0];

  return (
    <fieldset className="border-border/70 grid gap-5 rounded-xl border p-4">
      <legend className="px-1 font-semibold">Ingredientes da receita</legend>
      <p className="text-muted-foreground text-sm">
        Liste cada ingrediente na unidade em que você compra e informe o custo
        dessa mesma unidade. O Lucrivo não converte medidas automaticamente.
      </p>
      {collectionError ? (
        <p
          id={collectionPath}
          role="alert"
          aria-label="Erro nos ingredientes"
          tabIndex={-1}
          className="border-destructive/25 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm outline-none"
        >
          {collectionError}
        </p>
      ) : null}
      {item.ingredients.map((ingredient, ingredientIndex) => (
        <div
          key={ingredient.id}
          className="border-border/70 bg-muted/20 grid gap-4 rounded-xl border p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-medium">Ingrediente {ingredientIndex + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={`Remover ingrediente ${ingredientIndex + 1}`}
              disabled={item.ingredients.length === 1}
              onClick={() =>
                dispatch({
                  type: "removeIngredient",
                  itemId: item.id,
                  ingredientId: ingredient.id,
                })
              }
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["name", `Nome do ingrediente ${ingredientIndex + 1}`],
                [
                  "quantity",
                  `Quantidade do ingrediente ${ingredientIndex + 1}`,
                ],
                ["unit", `Unidade do ingrediente ${ingredientIndex + 1}`],
                [
                  "unitCost",
                  `Custo unitário do ingrediente ${ingredientIndex + 1}`,
                ],
              ] as const
            ).map(([field, label]) => (
              <StepField
                key={field}
                field={`items.${itemIndex}.ingredients.${ingredientIndex}.${field}`}
                label={label}
                value={ingredient[field]}
                errors={state.fieldErrors}
                onChange={(_path, value) =>
                  dispatch({
                    type: "changeIngredientField",
                    itemId: item.id,
                    ingredientId: ingredient.id,
                    field,
                    value,
                  })
                }
                prefix={field === "unitCost" ? "R$" : undefined}
                inputMode={
                  field === "name" || field === "unit" ? "decimal" : "decimal"
                }
              />
            ))}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        onClick={() =>
          dispatch({
            type: "addIngredient",
            itemId: item.id,
            createId: () => crypto.randomUUID(),
          })
        }
      >
        <PlusIcon aria-hidden="true" />
        Adicionar ingrediente
      </Button>
    </fieldset>
  );
}

export { IngredientFields };
