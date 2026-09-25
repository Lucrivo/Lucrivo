import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DetailedProductionItemInput } from "../../types";
import { IngredientCard } from "../ingredients/ingredient-card";
import { IngredientNameEntry } from "../ingredients/ingredient-name-entry";

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
      <div className="grid gap-3">
        {item.ingredients.map((ingredient, ingredientIndex) => {
          const basePath = `items.${itemIndex}.ingredients.${ingredientIndex}`;
          if (state.pendingIngredientNameId === ingredient.id) {
            return (
              <IngredientNameEntry
                key={ingredient.id}
                id={ingredient.id}
                value={ingredient.name}
                error={state.fieldErrors[`${basePath}.name`]?.[0]}
                canCancel
                onChange={(value) =>
                  dispatch({
                    type: "changeIngredientField",
                    itemId: item.id,
                    ingredientId: ingredient.id,
                    field: "name",
                    value,
                  })
                }
                onContinue={() =>
                  dispatch({
                    type: "confirmIngredientName",
                    itemId: item.id,
                    ingredientId: ingredient.id,
                  })
                }
                onCancel={() =>
                  dispatch({
                    type: "cancelIngredientName",
                    itemId: item.id,
                    ingredientId: ingredient.id,
                  })
                }
              />
            );
          }

          return (
            <IngredientCard
              key={ingredient.id}
              ingredient={ingredient}
              basePath={basePath}
              errors={state.fieldErrors}
              canRemove={item.ingredients.length > 1}
              defaultOpen={
                ingredient.quantity.trim() === "" ||
                ingredient.unit.trim() === "" ||
                ingredient.unitCost.trim() === ""
              }
              onChange={(field, value) =>
                dispatch({
                  type: "changeIngredientField",
                  itemId: item.id,
                  ingredientId: ingredient.id,
                  field,
                  value,
                })
              }
              onRemove={() =>
                dispatch({
                  type: "removeIngredient",
                  itemId: item.id,
                  ingredientId: ingredient.id,
                })
              }
            />
          );
        })}
      </div>
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
