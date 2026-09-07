import { calculateServiceFlowPreview } from "../../../domain/service-flow";
import { StepField } from "../../shared/step-field";
import { FlowSummary } from "./flow-summary";
import type { ServiceStepProps } from "./types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function FixedExpensesStep(props: ServiceStepProps) {
  const preview = calculateServiceFlowPreview(props.values);
  const canShowTotal =
    props.values.desiredMonthlyIncome.trim() !== "" &&
    props.values.fixedMonthlyExpenses.trim() !== "";

  return (
    <div className="grid gap-5">
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
            "Some aluguel, energia, internet, sistemas e outros gastos que continuam mesmo quando você atende pouco.",
          technicalTerm: "custos fixos",
        }}
      />
      {canShowTotal ? (
        <FlowSummary label="Quanto o negócio precisa gerar por mês">
          {currency.format(preview.monthlyRevenueTargetCents / 100)} para pagar
          os gastos do mês e deixar o valor que você quer receber.
        </FlowSummary>
      ) : null}
    </div>
  );
}

export { FixedExpensesStep };
