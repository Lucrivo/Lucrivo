import { StepField } from "../../shared/step-field";
import type { ServiceDiagnosisField } from "../../../types";
import type { ServiceStepProps } from "./types";

const priceFields = {
  hour: { field: "hourlyRate", label: "Quanto você cobra por hora?" },
  minute: { field: "minuteRate", label: "Quanto você cobra por minuto?" },
  appointment: {
    field: "appointmentRate",
    label: "Quanto você cobra por atendimento?",
  },
} as const satisfies Record<
  "hour" | "minute" | "appointment",
  { field: ServiceDiagnosisField; label: string }
>;

function CurrentPriceStep(props: ServiceStepProps) {
  const method = props.values.pricingMethod;
  if (method !== "hour" && method !== "minute" && method !== "appointment") {
    return null;
  }

  const price = priceFields[method];
  const requiresDuration = method === "minute" || method === "appointment";

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {requiresDuration ? (
        <StepField
          {...props}
          field="appointmentDurationMinutes"
          label="Quanto dura cada atendimento?"
          value={props.values.appointmentDurationMinutes}
          suffix="min"
          inputMode="numeric"
        />
      ) : null}
      <StepField
        {...props}
        field={price.field}
        label={price.label}
        value={props.values[price.field]}
        prefix="R$"
      />
    </div>
  );
}

export { CurrentPriceStep };
