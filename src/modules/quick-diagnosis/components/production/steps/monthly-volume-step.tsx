import { StepField } from "../../shared/step-field";
import type { ProductionStepProps } from "./types";

function MonthlyVolumeStep(props: ProductionStepProps) {
  return (
    <div className="grid gap-2">
      <StepField
        {...props}
        field="monthlySalesVolume"
        label="Volume médio mensal de unidades vendidas"
        value={props.values.monthlySalesVolume}
        suffix="unidades"
        inputMode="numeric"
      />
      <p className="text-muted-foreground text-sm">
        Opcional. Sem esse valor, o relatório mostrará referências sem o rateio
        dos custos fixos.
      </p>
    </div>
  );
}

export { MonthlyVolumeStep };
