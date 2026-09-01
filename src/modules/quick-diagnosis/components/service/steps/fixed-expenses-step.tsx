import { StepField } from "../../shared/step-field";
import type { ServiceStepProps } from "./types";

function FixedExpensesStep(props: ServiceStepProps) {
  return (
    <StepField
      {...props}
      field="fixedMonthlyExpenses"
      label="Despesas fixas mensais"
      value={props.values.fixedMonthlyExpenses}
      prefix="R$"
    />
  );
}

export { FixedExpensesStep };
