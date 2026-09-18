import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";

import type { DetailedStepProps } from "./types";

function DetailedFixedExpensesStep({ state, dispatch }: DetailedStepProps) {
  return (
    <StepField
      field="fixedMonthlyExpenses"
      label="Gastos que existem todo mês"
      value={state.values.fixedMonthlyExpenses}
      errors={state.fieldErrors}
      onChange={(field, value) =>
        dispatch({ type: "changeGeneralField", field, value })
      }
      prefix="R$"
      description="Some aluguel, energia, sistemas e outros gastos que continuam existindo mesmo sem vendas."
    />
  );
}

export { DetailedFixedExpensesStep };
