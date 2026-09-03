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
        description="Opcional. Deixe em branco se o produto não tiver custo direto."
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
