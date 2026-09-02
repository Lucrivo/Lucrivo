import { StepField } from "../../shared/step-field";
import type { ProductionStepProps } from "./types";

function ProductionFixedExpensesStep(props: ProductionStepProps) {
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

export { ProductionFixedExpensesStep };
