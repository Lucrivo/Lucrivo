import { ceilDivide, roundDivide } from "@/modules/reports/domain/integer-math";

import type {
  DetailedDiagnosisItem,
  DetailedItemCalculation,
  DetailedTechnicalSheetProductionItem,
} from "../types";

type DetailedItemRates = {
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};

function calculateTechnicalSheetCost(
  item: DetailedTechnicalSheetProductionItem,
): number {
  const ingredientTotalTenThousandths = item.ingredients.reduce(
    (sum, ingredient) =>
      sum +
      BigInt(
        roundDivide(
          BigInt(ingredient.quantityMillionths) *
            BigInt(ingredient.unitCostTenThousandths),
          BigInt(1_000_000),
        ),
      ),
    BigInt(0),
  );

  const sellableIngredientUnitTenThousandths = BigInt(
    roundDivide(
      ingredientTotalTenThousandths * BigInt(10_000),
      BigInt(item.recipeYield) * BigInt(10_000 - item.lossRateBasisPoints),
    ),
  );
  const ingredientUnitCents = roundDivide(
    sellableIngredientUnitTenThousandths,
    BigInt(100),
  );

  return (
    ingredientUnitCents +
    item.packagingUnitCostCents +
    item.directLaborUnitCostCents +
    item.otherVariableUnitCostCents
  );
}

function calculateVariableUnitCost(item: DetailedDiagnosisItem): number {
  if (item.kind === "resale") {
    return item.purchaseUnitCostCents + item.packagingUnitCostCents;
  }

  if (item.costMode === "summarized") {
    return item.productionUnitCostCents;
  }

  return calculateTechnicalSheetCost(item);
}

function calculatePriceFloor(
  variableUnitCostCents: number,
  denominatorBasisPoints: number,
): number | null {
  if (denominatorBasisPoints <= 0) return null;

  return ceilDivide(
    BigInt(variableUnitCostCents) * BigInt(10_000),
    BigInt(denominatorBasisPoints),
  );
}

function calculateDetailedItem(
  item: DetailedDiagnosisItem,
  rates: DetailedItemRates,
): DetailedItemCalculation {
  const variableUnitCostCents = calculateVariableUnitCost(item);
  const feeRateBasisPoints =
    rates.taxRateBasisPoints + rates.cardFeeRateBasisPoints;
  const netUnitRevenueCents = roundDivide(
    BigInt(item.unitSalePriceCents) * BigInt(10_000 - feeRateBasisPoints),
    BigInt(10_000),
  );
  const feeAmountCents = item.unitSalePriceCents - netUnitRevenueCents;
  const unitContributionCents = netUnitRevenueCents - variableUnitCostCents;
  const contributionMarginBasisPoints =
    item.unitSalePriceCents > 0
      ? roundDivide(
          BigInt(unitContributionCents) * BigInt(10_000),
          BigInt(item.unitSalePriceCents),
        )
      : null;
  const monthlyGrossRevenueCents =
    item.monthlySalesVolume === null
      ? null
      : roundDivide(
          BigInt(item.unitSalePriceCents) * BigInt(item.monthlySalesVolume),
          BigInt(1),
        );
  const monthlyContributionCents =
    item.monthlySalesVolume === null
      ? null
      : roundDivide(
          BigInt(unitContributionCents) * BigInt(item.monthlySalesVolume),
          BigInt(1),
        );

  return {
    itemId: item.id,
    variableUnitCostCents,
    feeAmountCents,
    netUnitRevenueCents,
    unitContributionCents,
    contributionMarginBasisPoints,
    monthlyGrossRevenueCents,
    monthlyContributionCents,
    breakEvenUnitPriceCents: calculatePriceFloor(
      variableUnitCostCents,
      10_000 - feeRateBasisPoints,
    ),
    directLoss: unitContributionCents <= 0,
  };
}

export { calculateDetailedItem };
export type { DetailedItemRates };
