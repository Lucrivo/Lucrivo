import type {
  ProductionDiagnosisField,
  ProductionDiagnosisFieldErrors,
  ProductionDiagnosisInput,
} from "../../../types";

type ProductionStepProps = {
  values: ProductionDiagnosisInput;
  errors: ProductionDiagnosisFieldErrors;
  onChange: (field: ProductionDiagnosisField, value: string) => void;
};

const productionStepFields = {
  productionValues: [
    "costCompositionEnabled",
    "productionUnitCost",
    "materialUnitCost",
    "packagingUnitCost",
    "directLaborUnitCost",
    "otherVariableUnitCost",
    "unitSalePrice",
  ],
  fixedExpenses: ["fixedMonthlyExpenses"],
  monthlyVolume: ["monthlySalesVolume"],
  ownerCompensation: ["proLabore"],
  fees: ["taxRate", "cardFeeRate"],
} as const satisfies Record<
  | "productionValues"
  | "fixedExpenses"
  | "monthlyVolume"
  | "ownerCompensation"
  | "fees",
  readonly ProductionDiagnosisField[]
>;

export { productionStepFields, type ProductionStepProps };
