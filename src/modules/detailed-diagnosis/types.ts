type DetailedDiagnosisCategory = "product" | "production";
type DetailedProductionCostMode = "summarized" | "technical_sheet";

type DetailedIngredientInput = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  unitCost: string;
};

type DetailedItemBaseInput = {
  id: string;
  name: string;
  unitSalePrice: string;
  monthlySalesVolume: string;
};

type DetailedProductItemInput = DetailedItemBaseInput & {
  kind: "resale";
  purchaseUnitCost: string;
  packagingUnitCost: string;
};

type DetailedProductionItemInput = DetailedItemBaseInput & {
  kind: "manufacturing";
  costMode: DetailedProductionCostMode;
  productionUnitCost: string;
  recipeYield: string;
  lossRate: string;
  packagingUnitCost: string;
  directLaborUnitCost: string;
  otherVariableUnitCost: string;
  ingredients: DetailedIngredientInput[];
};

type DetailedDiagnosisInput = {
  submissionId: string;
  category: DetailedDiagnosisCategory;
  fixedMonthlyExpenses: string;
  proLaboreIncluded: boolean;
  proLabore: string;
  taxRate: string;
  cardFeeRate: string;
  promotionMarginRate: string;
  items: Array<DetailedProductItemInput | DetailedProductionItemInput>;
};

type DetailedIngredient = {
  id: string;
  position: number;
  name: string;
  quantityMillionths: number;
  unit: string;
  unitCostTenThousandths: number;
};

type DetailedItemBase = {
  id: string;
  position: number;
  name: string;
  unitSalePriceCents: number;
  monthlySalesVolume: number | null;
};

type DetailedProductItem = DetailedItemBase & {
  kind: "resale";
  purchaseUnitCostCents: number;
  packagingUnitCostCents: number;
};

type DetailedSummarizedProductionItem = DetailedItemBase & {
  kind: "manufacturing";
  costMode: "summarized";
  productionUnitCostCents: number;
};

type DetailedTechnicalSheetProductionItem = DetailedItemBase & {
  kind: "manufacturing";
  costMode: "technical_sheet";
  recipeYield: number;
  lossRateBasisPoints: number;
  packagingUnitCostCents: number;
  directLaborUnitCostCents: number;
  otherVariableUnitCostCents: number;
  ingredients: DetailedIngredient[];
};

type DetailedProductionItem =
  DetailedSummarizedProductionItem | DetailedTechnicalSheetProductionItem;

type DetailedDiagnosisItem = DetailedProductItem | DetailedProductionItem;

type DetailedDiagnosisCommand = {
  submissionId: string;
  category: DetailedDiagnosisCategory;
  fixedMonthlyExpensesCents: number;
  proLaboreIncluded: boolean;
  proLaboreCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
  promotionMarginBasisPoints: number;
  items: DetailedDiagnosisItem[];
};

type DetailedItemCalculation = {
  itemId: string;
  variableUnitCostCents: number;
  feeAmountCents: number;
  netUnitRevenueCents: number;
  unitContributionCents: number;
  contributionMarginBasisPoints: number | null;
  monthlyGrossRevenueCents: number | null;
  monthlyContributionCents: number | null;
  breakEvenUnitPriceCents: number | null;
  promotionFloorCents: number | null;
  directLoss: boolean;
};

type DetailedDiagnosisVerdict =
  | "direct_loss"
  | "incomplete_volume"
  | "no_sales"
  | "operational_loss"
  | "break_even"
  | "tight_margin"
  | "adequate_margin";

type DetailedDiagnosisPriority =
  "cost" | "data" | "price" | "margin" | "volume";

type DetailedDiagnosisCalculation = {
  effectiveFixedCostCents: number;
  isPartial: boolean;
  missingVolumeItemIds: string[];
  items: DetailedItemCalculation[];
  monthlyGrossRevenueCents: number | null;
  monthlyContributionCents: number | null;
  monthlyResultCents: number | null;
  mixContributionMarginBasisPoints: number | null;
  finalMarginBasisPoints: number | null;
  breakEvenRevenueCents: number | null;
  verdict: DetailedDiagnosisVerdict;
  priority: DetailedDiagnosisPriority;
};

type DetailedGuidance = {
  key:
    | "missing_volume"
    | "direct_loss"
    | "concentration"
    | "best_unit_contribution"
    | "high_volume_low_margin"
    | "business_result";
  tone: "neutral" | "positive" | "warning" | "critical";
  title: string;
  body: string;
  itemIds: string[];
};

type DetailedDiagnosisFieldErrors = Record<string, string[]>;

type CreateDetailedDiagnosisActionResult =
  | { status: "success"; diagnosisId: number }
  | {
      status: "error";
      error: "invalid_input";
      fieldErrors: DetailedDiagnosisFieldErrors;
    }
  | {
      status: "error";
      error: "unauthorized" | "limit_reached" | "create_failed";
    };

export {
  type CreateDetailedDiagnosisActionResult,
  type DetailedDiagnosisCategory,
  type DetailedDiagnosisCalculation,
  type DetailedDiagnosisCommand,
  type DetailedDiagnosisFieldErrors,
  type DetailedDiagnosisInput,
  type DetailedDiagnosisItem,
  type DetailedDiagnosisPriority,
  type DetailedDiagnosisVerdict,
  type DetailedGuidance,
  type DetailedIngredient,
  type DetailedIngredientInput,
  type DetailedItemBase,
  type DetailedItemBaseInput,
  type DetailedItemCalculation,
  type DetailedProductItem,
  type DetailedProductItemInput,
  type DetailedProductionCostMode,
  type DetailedProductionItem,
  type DetailedProductionItemInput,
  type DetailedSummarizedProductionItem,
  type DetailedTechnicalSheetProductionItem,
};
