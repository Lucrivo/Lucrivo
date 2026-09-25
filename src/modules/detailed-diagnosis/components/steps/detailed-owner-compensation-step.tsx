import { OwnerCompensationFields } from "@/modules/quick-diagnosis/components/shared/business-fields";

import type { DetailedStepProps } from "./types";

function DetailedOwnerCompensationStep({ state, dispatch }: DetailedStepProps) {
  return (
    <OwnerCompensationFields
      switchId="proLaboreIncluded"
      included={state.values.proLaboreIncluded}
      amount={{
        field: "proLabore",
        value: state.values.proLabore,
        errors: state.fieldErrors,
        onChange: (value) =>
          dispatch({ type: "changeGeneralField", field: "proLabore", value }),
      }}
      onIncludedChange={(value) =>
        dispatch({
          type: "changeGeneralField",
          field: "proLaboreIncluded",
          value,
        })
      }
    />
  );
}

export { DetailedOwnerCompensationStep };
