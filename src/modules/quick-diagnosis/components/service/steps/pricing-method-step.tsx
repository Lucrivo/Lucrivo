import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { pricingMethods, type ServicePricingMethod } from "../../../types";
import type { ServiceStepProps } from "./types";

type PricingMethodStepProps = Pick<ServiceStepProps, "values" | "errors"> & {
  onPricingMethodChange: (value: ServicePricingMethod) => void;
};

const options = [
  {
    value: "hour",
    label: "Por hora",
    detail: "Para trabalhos medidos por tempo",
  },
  {
    value: "minute",
    label: "Por minuto",
    detail: "Para uso ou suporte por minuto",
  },
  {
    value: "appointment",
    label: "Por atendimento",
    detail: "Para sessões com duração definida",
  },
] as const;

function PricingMethodStep({
  values,
  errors,
  onPricingMethodChange,
}: PricingMethodStepProps) {
  const error = errors.pricingMethod?.[0];

  return (
    <div className="grid gap-3">
      <RadioGroup
        aria-label="Forma de cobrança"
        value={values.pricingMethod}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "pricingMethod-error" : undefined}
        onValueChange={(value) => {
          if (pricingMethods.some((method) => method === value)) {
            onPricingMethodChange(value as ServicePricingMethod);
          }
        }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="border-border bg-background hover:border-primary/40 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors"
          >
            <RadioGroupItem value={option.value} className="mt-0.5" />
            <span className="grid gap-1">
              <span className="font-semibold">{option.label}</span>
              <span
                aria-hidden="true"
                className="text-muted-foreground text-xs leading-relaxed"
              >
                {option.detail}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>
      {error ? (
        <p
          id="pricingMethod-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { PricingMethodStep };
