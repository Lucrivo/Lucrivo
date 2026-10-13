import { FixedExpensesField } from "../../shared/business-fields";
import type { ProductStepProps } from "./types";

function ProductFixedExpensesStep(props: ProductStepProps) {
  return (
    <FixedExpensesField
      field="fixedMonthlyExpenses"
      value={props.values.fixedMonthlyExpenses}
      errors={props.errors}
      onChange={(value) => props.onChange("fixedMonthlyExpenses", value)}
    />
  );
}

export { ProductFixedExpensesStep };
