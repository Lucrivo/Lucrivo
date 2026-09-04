import { calculateServiceFlowPreview } from "../../../domain/service-flow";
import { StepField } from "../../shared/step-field";
import { FlowSummary } from "./flow-summary";
import type { ServiceStepProps } from "./types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function ServiceDurationStep(props: ServiceStepProps) {
  const preview = calculateServiceFlowPreview(props.values);

  return (
    <div className="grid gap-5">
      <StepField
        {...props}
        field="appointmentDurationMinutes"
        label="Duração média do atendimento/serviço"
        value={props.values.appointmentDurationMinutes}
        suffix="min"
        inputMode="numeric"
        description="Ex.: 45 minutos. Use a média do início ao fim do atendimento."
      />
      {preview.currentEquivalentHourlyRateCents !== null &&
      preview.requiredHourlyRateCents !== null ? (
        <FlowSummary label="Comparação na mesma base">
          Seu preço atual equivale a{" "}
          {currency.format(preview.currentEquivalentHourlyRateCents / 100)} por
          hora. Para sua meta mensal, cada hora precisa gerar{" "}
          {currency.format(preview.requiredHourlyRateCents / 100)}.
        </FlowSummary>
      ) : null}
    </div>
  );
}

export { ServiceDurationStep };
