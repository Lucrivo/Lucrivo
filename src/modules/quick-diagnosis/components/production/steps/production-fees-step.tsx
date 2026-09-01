import { StepField } from "../../shared/step-field";
import type { ProductionStepProps } from "./types";

function ProductionFeesStep(props: ProductionStepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <StepField
        {...props}
        field="taxRate"
        label="Impostos"
        value={props.values.taxRate}
        suffix="%"
      />
      <StepField
        {...props}
        field="cardFeeRate"
        label="Taxa do cartão"
        value={props.values.cardFeeRate}
        suffix="%"
      />
    </div>
  );
}

export { ProductionFeesStep };
