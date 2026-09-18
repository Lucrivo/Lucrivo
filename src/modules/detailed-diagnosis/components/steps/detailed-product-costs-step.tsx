import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";

import type { DetailedStepProps } from "./types";

function DetailedProductCostsStep({ state, dispatch }: DetailedStepProps) {
  const itemIndex = state.values.items.findIndex(
    (item) => item.id === state.activeItemId,
  );
  const item = state.values.items[itemIndex];
  if (!item || item.kind !== "resale") return null;

  return (
    <div className="grid gap-5">
      <p className="text-muted-foreground text-sm">
        Informe os custos de cada produto para revenda, sempre por unidade.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <StepField
          field={`items.${itemIndex}.purchaseUnitCost`}
          label="Custo de compra por unidade"
          value={item.purchaseUnitCost}
          errors={state.fieldErrors}
          onChange={(_field, value) =>
            dispatch({
              type: "changeItemField",
              itemId: item.id,
              field: "purchaseUnitCost",
              value,
            })
          }
          prefix="R$"
        />
        <StepField
          field={`items.${itemIndex}.packagingUnitCost`}
          label="Embalagem por unidade"
          value={item.packagingUnitCost}
          errors={state.fieldErrors}
          onChange={(_field, value) =>
            dispatch({
              type: "changeItemField",
              itemId: item.id,
              field: "packagingUnitCost",
              value,
            })
          }
          prefix="R$"
        />
      </div>
    </div>
  );
}

export { DetailedProductCostsStep };
