import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { productKinds, type ProductKind } from "../../types";
import type { FieldBinding } from "./business-fields";
import { StepField } from "./step-field";
import { ResalePurchaseCostField } from "./unit-value-fields";

type ProductKindFieldProps = {
  field: string;
  value: string;
  error?: string;
  onChange: (value: ProductKind) => void;
};

type ProductDirectCostFieldProps = FieldBinding & {
  kind: ProductKind;
};

const productKindLabels = {
  resale: "Produto para revenda",
  digital: "Produto digital",
} satisfies Record<ProductKind, string>;

function ProductKindField({
  field,
  value,
  error,
  onChange,
}: ProductKindFieldProps) {
  const errorId = `${field}-error`;

  return (
    <div className="grid gap-3">
      <RadioGroup
        aria-label="Tipo de produto"
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onValueChange={(nextValue) => {
          if (productKinds.includes(nextValue as ProductKind)) {
            onChange(nextValue as ProductKind);
          }
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        {productKinds.map((kind) => (
          <label
            key={kind}
            className="border-border bg-background hover:border-primary/40 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors motion-reduce:transition-none"
          >
            <RadioGroupItem value={kind} className="mt-0.5" />
            <span className="font-semibold">{productKindLabels[kind]}</span>
          </label>
        ))}
      </RadioGroup>
      {error ? (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProductDirectCostField({
  kind,
  field,
  value,
  errors,
  onChange,
}: ProductDirectCostFieldProps) {
  if (kind === "resale") {
    return (
      <ResalePurchaseCostField
        field={field}
        value={value}
        errors={errors}
        onChange={onChange}
      />
    );
  }

  return (
    <StepField
      field={field}
      value={value}
      errors={errors}
      onChange={(_field, nextValue) => onChange(nextValue)}
      label="Existe algum gasto a cada venda?"
      prefix="R$"
      description="Opcional. Deixe em branco se o produto não tiver custo direto."
      help={{
        triggerLabel: "Entenda este custo",
        title: "Custo por venda",
        description:
          "Um produto digital pode não ter custo direto. Se houver licença, plataforma, entrega ou outra cobrança que acontece a cada venda, informe esse valor.",
      }}
    />
  );
}

export {
  ProductDirectCostField,
  ProductKindField,
  productKindLabels,
  type ProductDirectCostFieldProps,
  type ProductKindFieldProps,
};
