import { StepField } from "../../shared/step-field";
import type { ProductStepProps } from "./types";

function ProductFeesStep(props: ProductStepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <StepField
        {...props}
        field="taxRate"
        label="Qual porcentagem da venda vai para impostos?"
        value={props.values.taxRate}
        suffix="%"
      />
      <StepField
        {...props}
        field="cardFeeRate"
        label="Qual porcentagem fica com o cartão ou a plataforma?"
        value={props.values.cardFeeRate}
        suffix="%"
      />
    </div>
  );
}

export { ProductFeesStep };
