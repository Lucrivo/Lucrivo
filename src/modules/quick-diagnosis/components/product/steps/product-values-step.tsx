import { StepField } from "../../shared/step-field";
import type { ProductStepProps } from "./types";

function ProductValuesStep(props: ProductStepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <StepField
        {...props}
        field="purchaseUnitCost"
        label="Custo de compra por unidade"
        value={props.values.purchaseUnitCost}
        prefix="R$"
      />
      <StepField
        {...props}
        field="unitSalePrice"
        label="Preço de venda por unidade"
        value={props.values.unitSalePrice}
        prefix="R$"
      />
    </div>
  );
}

export { ProductValuesStep };
