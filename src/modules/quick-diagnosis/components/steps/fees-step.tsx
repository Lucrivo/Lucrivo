import { StepField, type StepProps } from "./step-field";

function FeesStep(props: StepProps) {
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

export { FeesStep };
