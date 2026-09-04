import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  isServiceMaterialCostUnit,
  serviceMaterialCostUnits,
  type ServiceMaterialCostUnit,
} from "../../../domain/service-flow";
import { StepField } from "../../shared/step-field";
import type { ServiceMaterialCostStepProps } from "./types";
import { YesNoChoice } from "./yes-no-choice";

const unitLabels = {
  appointment: "Por atendimento/serviço",
  hour: "Por hora",
  day: "Por dia",
  month: "Por mês",
} satisfies Record<ServiceMaterialCostUnit, string>;

function MaterialCostStep({
  values,
  errors,
  onChange,
  onHasMaterialCostChange,
  onMaterialCostUnitChange,
}: ServiceMaterialCostStepProps) {
  const unitError = errors.materialCostUnit?.[0];

  return (
    <div className="grid gap-5">
      <YesNoChoice
        question="Você possui algum custo para realizar o serviço?"
        field="hasMaterialCost"
        value={values.hasMaterialCost}
        error={errors.hasMaterialCost?.[0]}
        onChange={onHasMaterialCostChange}
      />

      {values.hasMaterialCost ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <StepField
            field="materialCost"
            label="Quanto custa, em média, o material ou insumo utilizado?"
            value={values.materialCost}
            errors={errors}
            onChange={onChange}
            prefix="R$"
          />
          <div className="grid content-start gap-2">
            <Label htmlFor="materialCostUnit">Esse custo acontece</Label>
            <Select
              value={values.materialCostUnit}
              onValueChange={(value) => {
                if (isServiceMaterialCostUnit(value)) {
                  onMaterialCostUnitChange(value);
                }
              }}
            >
              <SelectTrigger
                id="materialCostUnit"
                className="bg-background h-11 w-full shadow-xs"
                aria-invalid={Boolean(unitError)}
                aria-describedby={
                  unitError ? "materialCostUnit-error" : undefined
                }
              >
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent align="start">
                {serviceMaterialCostUnits.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unitLabels[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unitError ? (
              <p
                id="materialCostUnit-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {unitError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { MaterialCostStep };
