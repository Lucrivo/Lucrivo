import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";

import type { DetailedStepProps } from "./types";

function DetailedItemNameStep({ state, dispatch }: DetailedStepProps) {
  const itemIndex = state.values.items.findIndex(
    (item) => item.id === state.activeItemId,
  );
  const item = state.values.items[itemIndex];
  if (!item) return null;

  return (
    <StepField
      field={`items.${itemIndex}.name`}
      label={
        state.values.category === "product"
          ? "Nome do produto"
          : "Nome da produção"
      }
      value={item.name}
      errors={state.fieldErrors}
      onChange={(_field, value) =>
        dispatch({
          type: "changeItemField",
          itemId: item.id,
          field: "name",
          value,
        })
      }
      inputMode="text"
    />
  );
}

export { DetailedItemNameStep };
