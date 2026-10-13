import { MonthlyVolumeField } from "../../shared/business-fields";
import type { ProductionStepProps } from "./types";

function MonthlyVolumeStep(props: ProductionStepProps) {
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
