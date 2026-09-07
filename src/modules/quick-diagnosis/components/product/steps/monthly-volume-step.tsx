import { StepField } from "../../shared/step-field";
import type { ProductStepProps } from "./types";

function MonthlyVolumeStep(props: ProductStepProps) {
  return (
    <div className="grid gap-2">
      <StepField
        {...props}
        field="monthlySalesVolume"
        label="Quantas unidades você vende em um mês comum?"
        value={props.values.monthlySalesVolume}
        suffix="unidades"
        inputMode="numeric"
      />
      <p className="text-muted-foreground text-sm">
        Opcional. Sem essa quantidade, o resultado não consegue incluir os
        gastos mensais em cada unidade.
      </p>
    </div>
  );
}

export { MonthlyVolumeStep };
