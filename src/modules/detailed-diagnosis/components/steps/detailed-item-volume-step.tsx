import { MonthlyVolumeField } from "@/modules/quick-diagnosis/components/shared/business-fields";

import type { DetailedStepProps } from "./types";

function DetailedItemVolumeStep({ state, dispatch }: DetailedStepProps) {
  const itemIndex = state.values.items.findIndex(
    (item) => item.id === state.activeItemId,
  );
  const item = state.values.items[itemIndex];
  if (!item) return null;

  return (
    <MonthlyVolumeField
      field={`items.${itemIndex}.monthlySalesVolume`}
      value={item.monthlySalesVolume}
      errors={state.fieldErrors}
      onChange={(value) =>
        dispatch({
          type: "changeItemField",
          itemId: item.id,
          field: "monthlySalesVolume",
          value,
        })
      }
    />
  );
}

export { DetailedItemVolumeStep };
