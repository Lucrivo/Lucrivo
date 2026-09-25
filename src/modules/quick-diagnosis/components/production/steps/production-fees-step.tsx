import { SalesFeesFields } from "../../shared/business-fields";
import type { ProductionStepProps } from "./types";

function ProductionFeesStep(props: ProductionStepProps) {
  return (
    <SalesFeesFields
      tax={{
        field: "taxRate",
        value: props.values.taxRate,
        errors: props.errors,
        onChange: (value) => props.onChange("taxRate", value),
      }}
      card={{
        field: "cardFeeRate",
        value: props.values.cardFeeRate,
        errors: props.errors,
        onChange: (value) => props.onChange("cardFeeRate", value),
      }}
    />
  );
}

export { ProductionFeesStep };
