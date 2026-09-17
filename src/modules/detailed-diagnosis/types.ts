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

type DetailedDiagnosisCommand = {
  submissionId: string;
  category: DetailedDiagnosisCategory;
  fixedMonthlyExpensesCents: number;
  proLaboreIncluded: boolean;
  proLaboreCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
  promotionMarginBasisPoints: number;
  items: Array<DetailedProductItem | DetailedProductionItem>;
};

type DetailedDiagnosisFieldErrors = Record<string, string[]>;

export {
  type DetailedDiagnosisCategory,
  type DetailedDiagnosisCommand,
  type DetailedDiagnosisFieldErrors,
  type DetailedDiagnosisInput,
  type DetailedIngredient,
  type DetailedIngredientInput,
  type DetailedItemBase,
  type DetailedItemBaseInput,
  type DetailedProductItem,
  type DetailedProductItemInput,
  type DetailedProductionCostMode,
  type DetailedProductionItem,
  type DetailedProductionItemInput,
  type DetailedSummarizedProductionItem,
  type DetailedTechnicalSheetProductionItem,
};
