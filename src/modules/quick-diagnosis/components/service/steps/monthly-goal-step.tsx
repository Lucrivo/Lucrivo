import { StepField } from "../../shared/step-field";
import type { ServiceStepProps } from "./types";

function MonthlyGoalStep(props: ServiceStepProps) {
  return (
    <StepField
      {...props}
      field="desiredMonthlyIncome"
      label="Pró-labore mensal"
      value={props.values.desiredMonthlyIncome}
      prefix="R$"
    />
  );
}

export { MonthlyGoalStep };
