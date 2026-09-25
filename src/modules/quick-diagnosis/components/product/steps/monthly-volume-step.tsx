import { MonthlyVolumeField } from "../../shared/business-fields";
import type { ProductStepProps } from "./types";

function MonthlyVolumeStep(props: ProductStepProps) {
  return (
    <MonthlyVolumeField
      field="monthlySalesVolume"
      value={props.values.monthlySalesVolume}
      errors={props.errors}
      onChange={(value) => props.onChange("monthlySalesVolume", value)}
    />
  );
}

export { MonthlyVolumeStep };
