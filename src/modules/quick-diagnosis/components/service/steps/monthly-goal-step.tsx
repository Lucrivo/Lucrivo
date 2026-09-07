import { StepField } from "../../shared/step-field";
import type { ServiceStepProps } from "./types";

function MonthlyGoalStep(props: ServiceStepProps) {
  return (
    <StepField
      {...props}
      field="desiredMonthlyIncome"
      label="Quanto você quer receber por mês?"
      value={props.values.desiredMonthlyIncome}
      prefix="R$"
      description="Ex.: R$ 5.000. Informe o valor que o negócio precisa pagar pelo seu trabalho."
      help={{
        triggerLabel: "Por que informar?",
        title: "O valor que você recebe",
        description:
          "Inclua quanto o negócio precisa pagar pelo seu trabalho em um mês comum.",
        technicalTerm: "pró-labore",
      }}
    />
  );
}

export { MonthlyGoalStep };
