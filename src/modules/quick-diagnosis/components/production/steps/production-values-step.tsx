import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { StepField } from "../../shared/step-field";
import { deriveProductionUnitCostDisplay } from "../production-wizard-state";
import type { ProductionStepProps } from "./types";

type ProductionValuesStepProps = ProductionStepProps & {
  onCostCompositionEnabledChange: (value: boolean) => void;
};

function ProductionValuesStep({
  values,
  errors,
  onChange,
  onCostCompositionEnabledChange,
}: ProductionValuesStepProps) {
  const compositionError = errors.costCompositionEnabled?.[0];
  const total = deriveProductionUnitCostDisplay(values);

  return (
    <div className="grid gap-5">
      <div className="border-border bg-background flex items-center justify-between gap-5 rounded-xl border p-4 shadow-xs">
        <div className="grid gap-1">
          <Label htmlFor="costCompositionEnabled">
            Quer somar os gastos de produção por partes?
          </Label>
          <p
            id="costCompositionEnabled-help"
            className="text-muted-foreground text-sm"
          >
            Você sabe o custo total de uma unidade? Deixe esta opção desligada e
            informe apenas esse valor. Se preferir, detalhe cada parte.
          </p>
          {compositionError ? (
            <p
              id="costCompositionEnabled-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {compositionError}
            </p>
          ) : null}
        </div>
        <Switch
          id="costCompositionEnabled"
          checked={values.costCompositionEnabled}
          aria-invalid={Boolean(compositionError)}
          aria-describedby={
            compositionError
              ? "costCompositionEnabled-error"
              : "costCompositionEnabled-help"
          }
          onCheckedChange={onCostCompositionEnabledChange}
          className="motion-reduce:transition-none [&_[data-slot=switch-thumb]]:motion-reduce:transform-none"
        />
      </div>

      {values.costCompositionEnabled ? (
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <StepField
              field="materialUnitCost"
              label="Materiais"
              value={values.materialUnitCost}
              errors={errors}
              onChange={onChange}
              prefix="R$"
            />
            <StepField
              field="packagingUnitCost"
              label="Embalagem"
              value={values.packagingUnitCost}
              errors={errors}
              onChange={onChange}
              prefix="R$"
            />
            <StepField
              field="directLaborUnitCost"
              label="Seu tempo de produção"
              value={values.directLaborUnitCost}
              errors={errors}
              onChange={onChange}
              prefix="R$"
            />
            <StepField
              field="otherVariableUnitCost"
              label="Outros gastos por unidade"
              value={values.otherVariableUnitCost}
              errors={errors}
              onChange={onChange}
              prefix="R$"
            />
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Some os gastos usados para produzir uma unidade. O valor que você
            recebe pelo seu trabalho será informado na etapa própria.
          </p>
          <div className="border-primary/20 bg-primary/5 flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
            <span className="text-sm font-medium">
              Quanto custa produzir uma unidade?
            </span>
            <output
              htmlFor="costCompositionEnabled materialUnitCost packagingUnitCost directLaborUnitCost otherVariableUnitCost"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-primary font-semibold tabular-nums"
            >
              {total === null ? "Indisponível" : `R$ ${total}`}
            </output>
          </div>
        </div>
      ) : (
        <StepField
          field="productionUnitCost"
          label="Quanto custa produzir uma unidade?"
          value={values.productionUnitCost}
          errors={errors}
          onChange={onChange}
          prefix="R$"
        />
      )}

      <StepField
        field="unitSalePrice"
        label="Por quanto você vende cada unidade?"
        value={values.unitSalePrice}
        errors={errors}
        onChange={onChange}
        prefix="R$"
      />
    </div>
  );
}

export { ProductionValuesStep, type ProductionValuesStepProps };
