import { OwnerCompensationFields } from "../../shared/business-fields";
import type { ProductionStepProps } from "./types";

type OwnerCompensationStepProps = ProductionStepProps & {
  onProLaboreIncludedChange: (value: boolean) => void;
};

function OwnerCompensationStep({
  values,
  errors,
  onChange,
  onProLaboreIncludedChange,
}: OwnerCompensationStepProps) {
  return (
    <OwnerCompensationFields
      switchId="proLaboreIncluded"
      included={values.proLaboreIncluded}
      amount={{
        field: "proLabore",
        value: values.proLabore,
        errors,
        onChange: (value) => onChange("proLabore", value),
      }}
      onIncludedChange={onProLaboreIncludedChange}
    />
  );
}

export { OwnerCompensationStep, type OwnerCompensationStepProps };
