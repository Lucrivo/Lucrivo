import { StepField } from "../../shared/step-field";
import type { ProductStepProps } from "./types";

function MonthlyVolumeStep(props: ProductStepProps) {
  return (
    <div className="grid gap-2">
      <StepField
        {...props}
        field="monthlySalesVolume"
        label="Volume médio mensal de vendas"
        value={props.values.monthlySalesVolume}
        suffix="unidades"
        inputMode="numeric"
      />
      <p className="text-muted-foreground text-sm">
        Opcional. Sem esse valor, o relatório mostrará apenas referências sem o
        rateio dos custos fixos.
      </p>
    </div>
  );
}

export { MonthlyVolumeStep };
