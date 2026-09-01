import type {
  ProductDiagnosisField,
  ProductDiagnosisFieldErrors,
  ProductDiagnosisInput,
} from "../../../types";

type ProductStepProps = {
  values: ProductDiagnosisInput;
  errors: ProductDiagnosisFieldErrors;
  onChange: (field: ProductDiagnosisField, value: string) => void;
};

const productStepFields = {
  productValues: ["purchaseUnitCost", "unitSalePrice"],
  fixedExpenses: ["fixedMonthlyExpenses"],
  monthlyVolume: ["monthlySalesVolume"],
  ownerCompensation: ["proLabore"],
  fees: ["taxRate", "cardFeeRate"],
} as const satisfies Record<
  | "productValues"
  | "fixedExpenses"
  | "monthlyVolume"
  | "ownerCompensation"
  | "fees",
  readonly ProductDiagnosisField[]
>;

export { productStepFields, type ProductStepProps };
