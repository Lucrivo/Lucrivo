import type { ServiceDiagnosisField } from "../../types";
import { StepField, type StepProps } from "./step-field";

const priceFields = {
  hour: { field: "hourlyRate", label: "Valor por hora" },
  minute: { field: "minuteRate", label: "Valor por minuto" },
  appointment: { field: "appointmentRate", label: "Valor por atendimento" },
} as const satisfies Record<
  "hour" | "minute" | "appointment",
  { field: ServiceDiagnosisField; label: string }
>;

function CurrentPriceStep(props: StepProps) {
  const method = props.values.pricingMethod;
  if (method !== "hour" && method !== "minute" && method !== "appointment") {
    return null;
  }

  const price = priceFields[method];
  const requiresDuration = method === "minute" || method === "appointment";

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <StepField
        {...props}
        field={price.field}
        label={price.label}
        value={props.values[price.field]}
        prefix="R$"
      />
      {requiresDuration ? (
        <StepField
          {...props}
          field="appointmentDurationMinutes"
          label="Duração média do atendimento"
          value={props.values.appointmentDurationMinutes}
          suffix="min"
          inputMode="numeric"
        />
      ) : null}
    </div>
  );
}

export { CurrentPriceStep };
