import { StepField } from "../../shared/step-field";
import type { ProductStepProps } from "./types";

function MonthlyVolumeStep(props: ProductStepProps) {
  return (
    <div className="grid gap-2">
      <StepField
        {...props}
        field="monthlySalesVolume"
        label="Quantas unidades você vende por mês?"
        value={props.values.monthlySalesVolume}
        suffix="unidades"
        inputMode="numeric"
      />
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            Opcional
          </span>
        </div>
        <p className="text-muted-foreground text-sm leading-6">
          Se você já vende este item, informe a média mensal. Digite 0 se não
          vendeu nenhuma unidade. Se ainda não sabe ou quer descobrir quanto
          precisa vender, deixe em branco — o resultado será parcial e a meta
          aparecerá apenas como referência.
        </p>
      </div>
    </div>
  );
}

export { MonthlyVolumeStep };
