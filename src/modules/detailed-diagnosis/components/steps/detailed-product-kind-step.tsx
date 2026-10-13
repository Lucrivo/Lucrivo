import { ProductKindField } from "@/modules/quick-diagnosis/components/shared/product-fields";

import type { DetailedStepProps } from "./types";

function DetailedProductKindStep({ state, dispatch }: DetailedStepProps) {
  return (
    <ProductKindField
      field="productKind"
      value={state.productKind}
      error={state.productKindError ?? undefined}
      onChange={(value) => dispatch({ type: "setProductKind", value })}
    />
  );
}

export { DetailedProductKindStep };
