import { StepField, type StepProps } from "./step-field";

function MonthlyGoalStep(props: StepProps) {
  return (
    <StepField
      {...props}
      field="desiredMonthlyIncome"
      label="Renda mensal desejada"
      value={props.values.desiredMonthlyIncome}
      prefix="R$"
    />
  );
}

export { MonthlyGoalStep };
