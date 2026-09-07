import { StepField } from "../../shared/step-field";
import type { ProductionStepProps } from "./types";

function ProductionFixedExpensesStep(props: ProductionStepProps) {
  return (
    <StepField
      {...props}
      field="fixedMonthlyExpenses"
      label="Gastos que existem todo mês"
      value={props.values.fixedMonthlyExpenses}
      prefix="R$"
      help={{
        triggerLabel: "O que incluir?",
        title: "Gastos que existem todo mês",
        description:
          "Some aluguel, energia, internet, sistemas e outros gastos que continuam mesmo quando você vende pouco.",
        technicalTerm: "custos fixos",
      }}
    />
  );
}

export { ProductionFixedExpensesStep };
