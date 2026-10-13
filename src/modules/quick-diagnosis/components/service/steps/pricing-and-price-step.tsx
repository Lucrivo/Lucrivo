import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  isServiceFlowPricingMethod,
  servicePricingMethods,
  type ServiceFlowPricingMethod,
} from "../../../domain/service-flow";
import { StepField } from "../../shared/step-field";
import type { ServicePricingStepProps } from "./types";

const options = {
  appointment: { label: "Por atendimento/serviço", unit: "atendimento" },
  minute: { label: "Por minuto", unit: "minuto" },
  hour: { label: "Por hora", unit: "hora" },
  day: { label: "Por diária", unit: "diária" },
  week: { label: "Por semana", unit: "semana" },
  month: { label: "Por mês", unit: "mês" },
} satisfies Record<ServiceFlowPricingMethod, { label: string; unit: string }>;

function PricingAndPriceStep({
  values,
  errors,
  onChange,
  onPricingMethodChange,
}: ServicePricingStepProps) {
  const method = isServiceFlowPricingMethod(values.pricingMethod)
    ? values.pricingMethod
    : null;
  const methodError = errors.pricingMethod?.[0];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <RadioGroup
          aria-label="Forma de cobrança"
          value={values.pricingMethod}
          aria-invalid={Boolean(methodError)}
          aria-describedby={methodError ? "pricingMethod-error" : undefined}
          onValueChange={(value) => {
            if (isServiceFlowPricingMethod(value)) {
              onPricingMethodChange(value);
            }
          }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {servicePricingMethods.map((value) => (
            <label
              key={value}
              className="border-border bg-background hover:border-primary/40 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors motion-reduce:transition-none"
            >
              <RadioGroupItem value={value} className="mt-0.5" />
              <span className="font-semibold">{options[value].label}</span>
            </label>
          ))}
        </RadioGroup>
        {methodError ? (
          <p
            id="pricingMethod-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {methodError}
          </p>
        ) : null}
      </div>

      {method ? (
        <StepField
          field="currentPrice"
          label={`Quanto você cobra por ${options[method].unit}?`}
          value={values.currentPrice}
          errors={errors}
          onChange={onChange}
          prefix="R$"
        />
      ) : null}
    </div>
  );
}

export { PricingAndPriceStep };
