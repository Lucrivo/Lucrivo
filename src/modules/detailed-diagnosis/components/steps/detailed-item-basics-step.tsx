import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";

import type { DetailedStepProps } from "./types";

function DetailedItemBasicsStep({ state, dispatch }: DetailedStepProps) {
  const itemIndex = state.values.items.findIndex(
    (item) => item.id === state.activeItemId,
  );
  const item = state.values.items[itemIndex];
  if (!item) return null;

  const change = (
    field: "name" | "unitSalePrice" | "monthlySalesVolume",
    value: string,
  ) => dispatch({ type: "changeItemField", itemId: item.id, field, value });

  return (
    <div className="grid gap-5">
      <StepField
        field={`items.${itemIndex}.name`}
        label={
          state.values.category === "product"
            ? "Nome do produto"
            : "Nome da produção"
        }
        value={item.name}
        errors={state.fieldErrors}
        onChange={(_field, value) => change("name", value)}
        inputMode="decimal"
      />
      <StepField
        field={`items.${itemIndex}.unitSalePrice`}
        label="Preço de venda por unidade"
        value={item.unitSalePrice}
        errors={state.fieldErrors}
        onChange={(_field, value) => change("unitSalePrice", value)}
        prefix="R$"
      />
      <StepField
        field={`items.${itemIndex}.monthlySalesVolume`}
        label="Quantas unidades você vende por mês? (Opcional)"
        value={item.monthlySalesVolume}
        errors={state.fieldErrors}
        onChange={(_field, value) => change("monthlySalesVolume", value)}
        inputMode="numeric"
        description="Se você já vende este item, informe a média mensal. Digite 0 se não vendeu nenhuma unidade. Se ainda não sabe ou quer descobrir quanto precisa vender, deixe em branco, o resultado será parcial e a meta aparecerá apenas como referência."
      />
    </div>
  );
}

export { DetailedItemBasicsStep };
