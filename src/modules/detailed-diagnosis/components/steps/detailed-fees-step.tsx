import { StepField } from "@/modules/quick-diagnosis/components/shared/step-field";

import type { DetailedStepProps } from "./types";

function DetailedFeesStep({ state, dispatch }: DetailedStepProps) {
  const onChange = (
    field: "taxRate" | "cardFeeRate" | "promotionMarginRate",
    value: string,
  ) => dispatch({ type: "changeGeneralField", field, value });

  return (
    <div className="grid gap-5">
      <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
        Estas porcentagens se aplicam igualmente a todos os itens deste
        diagnóstico. A margem promocional serve apenas para simular descontos.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <StepField
          field="taxRate"
          label="Qual porcentagem da venda vai para impostos?"
          value={state.values.taxRate}
          errors={state.fieldErrors}
          onChange={onChange}
          suffix="%"
        />
        <StepField
          field="cardFeeRate"
          label="Qual porcentagem fica com o cartão ou a plataforma?"
          value={state.values.cardFeeRate}
          errors={state.fieldErrors}
          onChange={onChange}
          suffix="%"
        />
        <StepField
          field="promotionMarginRate"
          label="Margem mínima para simular promoções"
          value={state.values.promotionMarginRate}
          errors={state.fieldErrors}
          onChange={onChange}
          suffix="%"
        />
      </div>
    </div>
  );
}

export { DetailedFeesStep };
