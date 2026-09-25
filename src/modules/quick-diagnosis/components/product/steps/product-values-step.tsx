import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { productKinds, type ProductKind } from "../../../types";
import { StepField } from "../../shared/step-field";
import {
  ResalePurchaseCostField,
  UnitSalePriceField,
} from "../../shared/unit-value-fields";
import type { ProductStepProps } from "./types";

const productKindLabels = {
  resale: "Produto para revenda",
  digital: "Produto digital",
} satisfies Record<ProductKind, string>;

function ProductValuesStep(props: ProductStepProps) {
  const kind = productKinds.includes(props.values.productKind as ProductKind)
    ? (props.values.productKind as ProductKind)
    : null;
  const kindError = props.errors.productKind?.[0];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <RadioGroup
          aria-label="Tipo de produto"
          value={props.values.productKind}
          aria-invalid={Boolean(kindError)}
          aria-describedby={kindError ? "productKind-error" : undefined}
          onValueChange={(value) => {
            if (productKinds.includes(value as ProductKind)) {
              props.onChange("productKind", value);
            }
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          {productKinds.map((value) => (
            <label
              key={value}
              className="border-border bg-background hover:border-primary/40 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors motion-reduce:transition-none"
            >
              <RadioGroupItem value={value} className="mt-0.5" />
              <span className="font-semibold">{productKindLabels[value]}</span>
            </label>
          ))}
        </RadioGroup>
        {kindError ? (
          <p
            id="productKind-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {kindError}
          </p>
        ) : null}
      </div>

      {kind ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {kind === "digital" ? (
            <StepField
              {...props}
              field="purchaseUnitCost"
              label="Existe algum gasto a cada venda?"
              value={props.values.purchaseUnitCost}
              prefix="R$"
              description="Opcional. Deixe em branco se o produto não tiver custo direto."
              help={{
                triggerLabel: "Entenda este custo",
                title: "Custo por venda",
                description:
                  "Um produto digital pode não ter custo direto. Se houver licença, plataforma, entrega ou outra cobrança que acontece a cada venda, informe esse valor.",
              }}
            />
          ) : (
            <ResalePurchaseCostField
              field="purchaseUnitCost"
              value={props.values.purchaseUnitCost}
              errors={props.errors}
              onChange={(value) => props.onChange("purchaseUnitCost", value)}
            />
          )}
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
