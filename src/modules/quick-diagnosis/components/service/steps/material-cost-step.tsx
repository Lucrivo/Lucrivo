import { Label } from "@/components/ui/label";
import { PlainLanguageHelp } from "@/components/shared/plain-language-help";
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
  const selectedUnit = isServiceMaterialCostUnit(values.materialCostUnit)
    ? values.materialCostUnit
    : null;

  return (
    <div className="grid gap-5">
      <YesNoChoice
        question="Você gasta com materiais ou produtos para fazer este serviço?"
        field="hasMaterialCost"
        value={values.hasMaterialCost}
        error={errors.hasMaterialCost?.[0]}
        onChange={onHasMaterialCostChange}
      />

      {values.hasMaterialCost ? (
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <StepField
              field="materialCost"
              label="Quanto você gasta, em média, com esses materiais?"
              value={values.materialCost}
              errors={errors}
              onChange={onChange}
              prefix="R$"
              labelClassName="sm:min-h-8 sm:items-end"
            />
            <div className="grid content-start gap-2">
              <Label
                htmlFor="materialCostUnit"
                className="sm:min-h-8 sm:items-end"
              >
                Quando esse gasto acontece?
              </Label>
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
                  <SelectValue placeholder="Escolha uma opção">
                    {selectedUnit ? unitLabels[selectedUnit] : null}
                  </SelectValue>
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

          {values.materialCostUnit === "appointment" &&
          values.pricingMethod !== "appointment" ? (
            <div className="grid gap-2">
              <StepField
                field="appointmentDurationMinutes"
                label="Quanto tempo dura, em média, um serviço?"
                value={values.appointmentDurationMinutes}
                errors={errors}
                onChange={onChange}
                suffix="minutos"
              />
              <PlainLanguageHelp
                title="Por que pedimos esse tempo?"
                description="Usamos esse tempo somente para distribuir o gasto do atendimento no valor por hora."
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { MaterialCostStep };
