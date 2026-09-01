import { StepField } from "../../shared/step-field";
import type { ProductStepProps } from "./types";

function ProductFixedExpensesStep(props: ProductStepProps) {
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

export { ProductFixedExpensesStep };
