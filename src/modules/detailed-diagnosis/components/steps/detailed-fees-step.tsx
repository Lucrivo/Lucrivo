import { SalesFeesFields } from "@/modules/quick-diagnosis/components/shared/business-fields";

import type { DetailedStepProps } from "./types";

function DetailedFeesStep({ state, dispatch }: DetailedStepProps) {
  return (
    <SalesFeesFields
      tax={{
        field: "taxRate",
        value: state.values.taxRate,
        errors: state.fieldErrors,
        onChange: (value) =>
          dispatch({ type: "changeGeneralField", field: "taxRate", value }),
      }}
      card={{
        field: "cardFeeRate",
        value: state.values.cardFeeRate,
        errors: state.fieldErrors,
        onChange: (value) =>
          dispatch({
            type: "changeGeneralField",
            field: "cardFeeRate",
            value,
          }),
      }}
    />
  );
}

export { DetailedFeesStep };
