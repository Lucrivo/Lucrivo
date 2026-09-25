import { StepField } from "./step-field";
import type { FieldBinding } from "./business-fields";

function toStepFieldProps(binding: FieldBinding) {
  return {
    field: binding.field,
    value: binding.value,
    errors: binding.errors,
    onChange: (_field: string, value: string) => binding.onChange(value),
  };
}

function ResalePurchaseCostField(binding: FieldBinding) {
  return (
    <StepField
      {...toStepFieldProps(binding)}
      label="Quanto você paga ao fornecedor por unidade?"
      prefix="R$"
      description="Opcional. Deixe em branco se o produto não tiver custo direto."
    />
  );
}

function ProductionUnitCostField(binding: FieldBinding) {
  return (
    <StepField
      {...toStepFieldProps(binding)}
      label="Quanto custa produzir uma unidade?"
      prefix="R$"
    />
  );
}

function UnitSalePriceField(binding: FieldBinding) {
  return (
    <StepField
      {...toStepFieldProps(binding)}
      label="Por quanto você vende cada unidade?"
      prefix="R$"
    />
  );
}

export { ProductionUnitCostField, ResalePurchaseCostField, UnitSalePriceField };
