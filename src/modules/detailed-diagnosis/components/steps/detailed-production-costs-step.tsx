import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";

import { IngredientFields } from "./ingredient-fields";
import type { DetailedStepProps } from "./types";

function DetailedProductionCostsStep({ state, dispatch }: DetailedStepProps) {
  const itemIndex = state.values.items.findIndex(
    (item) => item.id === state.activeItemId,
  );
  const item = state.values.items[itemIndex];
  if (!item || item.kind !== "manufacturing") return null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <p className="font-medium">Como você quer informar o custo?</p>
        <RadioGroup
          aria-label="Modo de custo da produção"
          value={item.costMode}
          onValueChange={(costMode) => {
            if (costMode === "summarized" || costMode === "technical_sheet")
              dispatch({ type: "setCostMode", itemId: item.id, costMode });
          }}
          className="sm:grid-cols-2"
        >
          <Label className="border-border bg-background min-h-20 cursor-pointer items-start rounded-xl border p-4">
            <RadioGroupItem value="summarized" />
            <span className="grid gap-1">
              <span>Custo total por unidade</span>
              <span className="text-muted-foreground text-xs leading-relaxed font-normal">
                Use quando você já sabe quanto custa a unidade pronta.
              </span>
            </span>
          </Label>
          <Label className="border-border bg-background min-h-20 cursor-pointer items-start rounded-xl border p-4">
            <RadioGroupItem value="technical_sheet" />
            <span className="grid gap-1">
              <span>Ficha técnica completa</span>
              <span className="text-muted-foreground text-xs leading-relaxed font-normal">
                Detalhe receita, perdas, embalagem e trabalho direto.
              </span>
            </span>
          </Label>
        </RadioGroup>
      </div>

      {item.costMode === "summarized" ? (
        <StepField
          field={`items.${itemIndex}.productionUnitCost`}
          label="Custo total por unidade pronta"
          value={item.productionUnitCost}
          errors={state.fieldErrors}
          onChange={(_field, value) =>
            dispatch({
              type: "changeItemField",
              itemId: item.id,
              field: "productionUnitCost",
              value,
            })
          }
          prefix="R$"
        />
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                ["recipeYield", "Rendimento da receita", undefined],
                ["lossRate", "Perda da produção", "%"],
                ["packagingUnitCost", "Embalagem por unidade", undefined],
                [
                  "directLaborUnitCost",
                  "Mão de obra direta por unidade",
                  undefined,
                ],
                [
                  "otherVariableUnitCost",
                  "Outros custos variáveis por unidade",
                  undefined,
                ],
              ] as const
            ).map(([field, label, suffix]) => (
              <StepField
                key={field}
                field={`items.${itemIndex}.${field}`}
                label={label}
                value={item[field]}
                errors={state.fieldErrors}
                onChange={(_path, value) =>
                  dispatch({
                    type: "changeItemField",
                    itemId: item.id,
                    field,
                    value,
                  })
                }
                prefix={
                  field.endsWith("Cost") || field.endsWith("UnitCost")
                    ? "R$"
                    : undefined
                }
                suffix={suffix}
                inputMode={field === "recipeYield" ? "numeric" : "decimal"}
              />
            ))}
          </div>
          <IngredientFields
            state={state}
            dispatch={dispatch}
            item={item}
            itemIndex={itemIndex}
          />
        </div>
      )}
    </div>
  );
}

export { DetailedProductionCostsStep };
