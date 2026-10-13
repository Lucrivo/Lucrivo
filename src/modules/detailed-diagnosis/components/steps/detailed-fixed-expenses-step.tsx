import { FixedExpensesField } from "@/modules/quick-diagnosis/components/shared/business-fields";

import type { DetailedStepProps } from "./types";

function DetailedFixedExpensesStep({ state, dispatch }: DetailedStepProps) {
  return (
    <FixedExpensesField
      field="fixedMonthlyExpenses"
      value={state.values.fixedMonthlyExpenses}
      errors={state.fieldErrors}
      onChange={(value) =>
        dispatch({
          type: "changeGeneralField",
          field: "fixedMonthlyExpenses",
          value,
        })
      }
    />
  );
}

export { DetailedFixedExpensesStep };
