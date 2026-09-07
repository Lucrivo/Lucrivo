import { StepField } from "../../shared/step-field";
import type { ServiceStepProps } from "./types";

function MonthlyGoalStep(props: ServiceStepProps) {
  return (
    <StepField
      {...props}
      field="desiredMonthlyIncome"
      label="Ganho mensal desejado"
      value={props.values.desiredMonthlyIncome}
      prefix="R$"
      description="Ex.: R$ 5.000. Informe quanto você quer que sobre para você por mês."
    />
  );
}

export { MonthlyGoalStep };
