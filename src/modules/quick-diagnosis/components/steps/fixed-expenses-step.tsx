import { StepField, type StepProps } from "./step-field";

function FixedExpensesStep(props: StepProps) {
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
