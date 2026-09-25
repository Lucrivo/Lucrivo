import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";
import {
  ResalePurchaseCostField,
  UnitSalePriceField,
} from "@/modules/quick-diagnosis/components/shared/unit-value-fields";

import type { DetailedStepProps } from "./types";

function DetailedProductCostsStep({ state, dispatch }: DetailedStepProps) {
  const itemIndex = state.values.items.findIndex(
    (item) => item.id === state.activeItemId,
  );
  const item = state.values.items[itemIndex];
  if (!item || item.kind !== "resale") return null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <ResalePurchaseCostField
          field={`items.${itemIndex}.purchaseUnitCost`}
          value={item.purchaseUnitCost}
          errors={state.fieldErrors}
          onChange={(value) =>
            dispatch({
              type: "changeItemField",
              itemId: item.id,
              field: "purchaseUnitCost",
              value,
            })
          }
        />
        <UnitSalePriceField
          field={`items.${itemIndex}.unitSalePrice`}
          value={item.unitSalePrice}
          errors={state.fieldErrors}
          onChange={(value) =>
            dispatch({
              type: "changeItemField",
              itemId: item.id,
              field: "unitSalePrice",
              value,
            })
          }
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
