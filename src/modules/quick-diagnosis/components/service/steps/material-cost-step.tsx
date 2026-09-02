import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { ServiceDiagnosisInput } from "../../../types";
import { StepField } from "../../shared/step-field";
import type { ServiceMaterialCostStepProps } from "./types";

function usesHourlyMaterialUnit(values: ServiceDiagnosisInput): boolean {
  return values.pricingMethod === "hour";
}

function getMaterialCostQuestion(values: ServiceDiagnosisInput): string {
  return usesHourlyMaterialUnit(values)
    ? "Você tem algum custo de material por hora trabalhada?"
    : "Você tem algum custo de material por atendimento?";
}

function getMaterialCostFieldLabel(values: ServiceDiagnosisInput): string {
  return usesHourlyMaterialUnit(values)
    ? "Custo de material por hora"
    : "Custo de material por atendimento";
}

function MaterialCostStep({
  values,
  errors,
  onChange,
  onHasMaterialCostChange,
}: ServiceMaterialCostStepProps) {
  const indicatorError = errors.hasMaterialCost?.[0];
  const indicatorErrorId = "hasMaterialCost-error";
  const helpId = "hasMaterialCost-help";

  return (
    <div className="grid gap-5">
      <div className="border-border bg-background flex items-center justify-between gap-5 rounded-xl border p-4 shadow-xs">
        <div className="grid gap-1">
          <Label htmlFor="hasMaterialCost">
            {getMaterialCostQuestion(values)}
          </Label>
          <p id={helpId} className="text-muted-foreground text-sm">
            Informe somente o material consumido diretamente para prestar o
            serviço.
          </p>
          {indicatorError ? (
            <p
              id={indicatorErrorId}
              role="alert"
              className="text-destructive text-sm"
            >
              {indicatorError}
            </p>
          ) : null}
        </div>
        <Switch
          id="hasMaterialCost"
          checked={values.hasMaterialCost}
          aria-invalid={Boolean(indicatorError)}
          aria-describedby={indicatorError ? indicatorErrorId : helpId}
          onCheckedChange={onHasMaterialCostChange}
          className="motion-reduce:transition-none [&_[data-slot=switch-thumb]]:motion-reduce:transform-none"
        />
      </div>

      {values.hasMaterialCost ? (
        <StepField
          field="materialUnitCost"
          label={getMaterialCostFieldLabel(values)}
          value={values.materialUnitCost}
          errors={errors}
          onChange={onChange}
          prefix="R$"
        />
      ) : null}
    </div>
  );
}

export { getMaterialCostFieldLabel, getMaterialCostQuestion, MaterialCostStep };
