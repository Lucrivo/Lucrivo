import { productKinds, type ProductKind } from "../../../types";
import {
  ProductDirectCostField,
  ProductKindField,
} from "../../shared/product-fields";
import { UnitSalePriceField } from "../../shared/unit-value-fields";
import type { ProductStepProps } from "./types";

function ProductValuesStep(props: ProductStepProps) {
  const kind = productKinds.includes(props.values.productKind as ProductKind)
    ? (props.values.productKind as ProductKind)
    : null;
  const kindError = props.errors.productKind?.[0];

  return (
    <div className="grid gap-5">
      <ProductKindField
        field="productKind"
        value={props.values.productKind}
        error={kindError}
        onChange={(value) => props.onChange("productKind", value)}
      />

      {kind ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <ProductDirectCostField
            kind={kind}
            field="purchaseUnitCost"
            value={props.values.purchaseUnitCost}
            errors={props.errors}
            onChange={(value) => props.onChange("purchaseUnitCost", value)}
          />
          <UnitSalePriceField
            field="unitSalePrice"
            value={props.values.unitSalePrice}
            errors={props.errors}
            onChange={(value) => props.onChange("unitSalePrice", value)}
          />
        </div>
      ) : null}
    </div>
  );
}

export { ProductValuesStep };
