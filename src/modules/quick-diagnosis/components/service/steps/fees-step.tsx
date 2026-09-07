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
          question="Você paga impostos sobre o valor recebido?"
          field="paysRevenueTax"
          value={values.paysRevenueTax}
          error={errors.paysRevenueTax?.[0]}
          onChange={onPaysRevenueTaxChange}
        />
        {values.paysRevenueTax ? (
          <StepField
            field="taxRate"
            label="Qual porcentagem do valor recebido vai para impostos?"
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
            label="Qual porcentagem fica com o cartão ou a plataforma?"
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
