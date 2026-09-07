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
        label="Total dos custos fixos mensais"
        value={props.values.fixedMonthlyExpenses}
        prefix="R$"
        description="Some aluguel, energia, internet, sistemas e outros gastos que existem todo mês."
      />
      {canShowTotal ? (
        <FlowSummary label="Quanto a atividade precisa gerar por mês">
          {currency.format(preview.monthlyRevenueTargetCents / 100)} para cobrir
          seus custos fixos e alcançar o ganho desejado.
        </FlowSummary>
      ) : null}
    </div>
  );
}

export { FixedExpensesStep };
