import { FixedExpensesField } from "../../shared/business-fields";
import type { ProductionStepProps } from "./types";

function ProductionFixedExpensesStep(props: ProductionStepProps) {
  return (
    <FixedExpensesField
      field="fixedMonthlyExpenses"
      value={props.values.fixedMonthlyExpenses}
      errors={props.errors}
      onChange={(value) => props.onChange("fixedMonthlyExpenses", value)}
    />
  );
}

export { ProductionFixedExpensesStep };
