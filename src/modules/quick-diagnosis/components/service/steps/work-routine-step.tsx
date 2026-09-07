import { calculateServiceFlowPreview } from "../../../domain/service-flow";
import { StepField } from "../../shared/step-field";
import { FlowSummary } from "./flow-summary";
import type { ServiceStepProps } from "./types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const decimal = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

function WorkRoutineStep(props: ServiceStepProps) {
  const preview = calculateServiceFlowPreview(props.values);
  const hasCapacity = preview.monthlyWorkMinutes > 0;
  const showCurrentEquivalent =
    props.values.pricingMethod !== "appointment" &&
    preview.currentEquivalentHourlyRateCents !== null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <StepField
          {...props}
          field="dailyWorkHours"
          label="Quantas horas por dia?"
          value={props.values.dailyWorkHours}
          suffix="h"
        />
        <StepField
          {...props}
          field="weeklyWorkDays"
          label="Quantos dias por semana?"
          value={props.values.weeklyWorkDays}
          inputMode="numeric"
        />
      </div>

      {hasCapacity && preview.requiredHourlyRateCents !== null ? (
        <FlowSummary label="Capacidade mensal estimada">
          <span className="block">
            {decimal.format(preview.monthlyWorkMinutes / 60)} horas por mês
          </span>
          <span className="text-muted-foreground mt-1 block font-normal">
            Para gerar{" "}
            {currency.format(preview.monthlyRevenueTargetCents / 100)}, cada
            hora precisa gerar{" "}
            {currency.format(preview.requiredHourlyRateCents / 100)}.
          </span>
          {showCurrentEquivalent ? (
            <span className="text-muted-foreground mt-1 block font-normal">
              Seu preço atual equivale a{" "}
              {currency.format(preview.currentEquivalentHourlyRateCents! / 100)}{" "}
              por hora.
            </span>
          ) : null}
        </FlowSummary>
      ) : null}
    </div>
  );
}

export { WorkRoutineStep };
