import { StepField } from "../../shared/step-field";
import type { ServiceFeesStepProps } from "./types";
import { YesNoChoice } from "./yes-no-choice";

function FeesStep({
  values,
  errors,
  onChange,
  onPaysRevenueTaxChange,
  onHasPaymentFeeChange,
}: ServiceFeesStepProps) {
  return (
    <div className="grid gap-7">
      <div className="grid gap-4">
        <YesNoChoice
          question="Você paga imposto sobre o faturamento?"
          field="paysRevenueTax"
          value={values.paysRevenueTax}
          error={errors.paysRevenueTax?.[0]}
          onChange={onPaysRevenueTaxChange}
        />
        {values.paysRevenueTax ? (
          <StepField
            field="taxRate"
            label="Percentual médio de imposto"
            value={values.taxRate}
            errors={errors}
            onChange={onChange}
            suffix="%"
          />
        ) : null}
      </div>

      <div className="border-border grid gap-4 border-t pt-6">
        <YesNoChoice
          question="Você recebe por cartão ou plataforma que cobra taxa?"
          field="hasPaymentFee"
          value={values.hasPaymentFee}
          error={errors.hasPaymentFee?.[0]}
          onChange={onHasPaymentFeeChange}
        />
        {values.hasPaymentFee ? (
          <StepField
            field="paymentFeeRate"
            label="Percentual médio da taxa"
            value={values.paymentFeeRate}
            errors={errors}
            onChange={onChange}
            suffix="%"
          />
        ) : null}
      </div>
    </div>
  );
}

export { FeesStep };
