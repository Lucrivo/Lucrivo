import { roundDivide } from "@/modules/reports/domain/integer-math";
import {
  calculateAllocatedUnitEconomics,
  calculateDirectUnitEconomics,
} from "@/modules/reports/domain/unit-economics";

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
  switch (item.kind) {
    case "digital":
      return item.purchaseUnitCostCents;
    case "resale":
      return item.purchaseUnitCostCents + item.packagingUnitCostCents;
    case "manufacturing":
      return item.costMode === "summarized"
        ? item.productionUnitCostCents
        : calculateTechnicalSheetCost(item);
  }
}

function calculateDetailedItem(
  item: DetailedDiagnosisItem,
  rates: DetailedItemRates,
  fixedAllocationCents: number | null,
): DetailedItemCalculation {
  const variableUnitCostCents = calculateVariableUnitCost(item);
  const totalFeeBasisPoints =
    rates.taxRateBasisPoints + rates.cardFeeRateBasisPoints;
  const direct = calculateDirectUnitEconomics({
    currentPriceCents: item.unitSalePriceCents,
    directUnitCostCents: variableUnitCostCents,
    totalFeeBasisPoints,
  });
  const allocated =
    fixedAllocationCents === null
      ? null
      : calculateAllocatedUnitEconomics({
          ...direct,
          currentPriceCents: item.unitSalePriceCents,
          directUnitCostCents: variableUnitCostCents,
          totalFeeBasisPoints,
          fixedAllocationCents,
        });
  const contributionMarginBasisPoints =
    item.unitSalePriceCents > 0
      ? roundDivide(
          BigInt(direct.unitContributionCents) * BigInt(10_000),
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
          BigInt(direct.unitContributionCents) *
            BigInt(item.monthlySalesVolume),
          BigInt(1),
        );

  return {
    itemId: item.id,
    variableUnitCostCents,
    feeAmountCents: direct.feeAmountCents,
    netUnitRevenueCents: direct.netRevenueCents,
    unitContributionCents: direct.unitContributionCents,
    contributionMarginBasisPoints,
    fixedAllocationCents,
    totalUnitCostCents: allocated?.totalUnitCostCents ?? null,
    unitProfitCents: allocated?.unitProfitCents ?? null,
    realMarginBasisPoints: allocated?.realMarginBasisPoints ?? null,
    monthlyGrossRevenueCents,
    monthlyContributionCents,
    breakEvenUnitPriceCents: allocated?.minimumPriceCents ?? null,
    directLoss: direct.unitContributionCents <= 0,
  };
}

export { calculateDetailedItem };
export type { DetailedItemRates };
