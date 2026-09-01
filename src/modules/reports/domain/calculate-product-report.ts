import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type {
  ProductReportCalculation,
  ProductReportPriority,
  ProductReportVerdict,
} from "../types";
import { ceilDivide, multiplyDivideRound, roundDivide } from "./integer-math";

const RATE_SCALE = 10_000;
const PRODUCT_TARGET_MARGIN_BPS = 2_000;
const PRODUCT_MARGIN_TOLERANCE_BPS = 50;
const PRODUCT_ABOVE_TARGET_BPS = 300;
const WEEKLY_DIVISOR_HUNDREDTHS = 433;
const PRODUCT_OPERATING_DAYS_PER_WEEK = 6;

function classifyProductMargin(input: {
  unitContributionCents: number;
  monthlySalesVolume: number | null;
  realMarginBasisPoints: number | null;
}): { verdict: ProductReportVerdict; priority: ProductReportPriority } {
  if (input.unitContributionCents <= 0) {
    return { verdict: "direct_loss", priority: "cost" };
  }
  if (input.monthlySalesVolume === null) {
    return { verdict: "incomplete_volume", priority: "data" };
  }
  if (
    input.realMarginBasisPoints === null ||
    input.realMarginBasisPoints <= 0
  ) {
    return { verdict: "operational_loss", priority: "price" };
  }
  if (
    input.realMarginBasisPoints <
    PRODUCT_TARGET_MARGIN_BPS - PRODUCT_MARGIN_TOLERANCE_BPS
  ) {
    return { verdict: "tight_margin", priority: "margin" };
  }
  if (
    input.realMarginBasisPoints <=
    PRODUCT_TARGET_MARGIN_BPS + PRODUCT_ABOVE_TARGET_BPS
  ) {
    return { verdict: "adequate_margin", priority: "volume" };
  }
  return { verdict: "above_target", priority: "volume" };
}

function calculateProductReport(
  command: ProductDiagnosisCommand,
): ProductReportCalculation {
  const effectiveFixedCostCents = roundDivide(
    BigInt(command.fixedMonthlyExpensesCents) +
      BigInt(command.proLaboreCents),
    BigInt(1),
  );
  const totalFeeBasisPoints = roundDivide(
    BigInt(command.taxRateBasisPoints) + BigInt(command.cardFeeRateBasisPoints),
    BigInt(1),
  );
  const netRateBasisPoints = RATE_SCALE - totalFeeBasisPoints;
  const targetRateBasisPoints =
    netRateBasisPoints - PRODUCT_TARGET_MARGIN_BPS;
  const netRevenueCents = multiplyDivideRound(
    command.unitSalePriceCents,
    netRateBasisPoints,
    RATE_SCALE,
  );
  const unitContributionCents = roundDivide(
    BigInt(netRevenueCents) - BigInt(command.purchaseUnitCostCents),
    BigInt(1),
  );
  const fixedAllocationCents =
    command.monthlySalesVolume === null
      ? null
      : ceilDivide(
          BigInt(effectiveFixedCostCents),
          BigInt(command.monthlySalesVolume),
        );
  const totalUnitCostCents =
    fixedAllocationCents === null
      ? null
      : roundDivide(
          BigInt(command.purchaseUnitCostCents) +
            BigInt(fixedAllocationCents),
          BigInt(1),
        );
  const unitProfitCents =
    totalUnitCostCents === null
      ? null
      : roundDivide(
          BigInt(netRevenueCents) - BigInt(totalUnitCostCents),
          BigInt(1),
        );
  const realMarginBasisPoints =
    unitProfitCents === null || command.unitSalePriceCents <= 0
      ? null
      : roundDivide(
          BigInt(unitProfitCents) * BigInt(RATE_SCALE),
          BigInt(command.unitSalePriceCents),
        );
  const referenceCostCents =
    totalUnitCostCents ?? command.purchaseUnitCostCents;
  const minimumPriceCents =
    netRateBasisPoints > 0
      ? ceilDivide(
          BigInt(referenceCostCents) * BigInt(RATE_SCALE),
          BigInt(netRateBasisPoints),
        )
      : null;
  const targetPriceCents =
    targetRateBasisPoints > 0
      ? ceilDivide(
          BigInt(referenceCostCents) * BigInt(RATE_SCALE),
          BigInt(targetRateBasisPoints),
        )
      : null;
  const monthlySalesGoal =
    unitContributionCents > 0
      ? ceilDivide(
          BigInt(effectiveFixedCostCents),
          BigInt(unitContributionCents),
        )
      : null;
  const weeklySalesGoal =
    monthlySalesGoal === null
      ? null
      : ceilDivide(
          BigInt(monthlySalesGoal) * BigInt(100),
          BigInt(WEEKLY_DIVISOR_HUNDREDTHS),
        );
  const dailySalesGoal =
    weeklySalesGoal === null
      ? null
      : ceilDivide(
          BigInt(weeklySalesGoal),
          BigInt(PRODUCT_OPERATING_DAYS_PER_WEEK),
        );
  const breakEvenDiscountPercent =
    minimumPriceCents === null || command.unitSalePriceCents <= 0
      ? null
      : Math.max(
          0,
          roundDivide(
            BigInt(command.unitSalePriceCents - minimumPriceCents) *
              BigInt(100),
            BigInt(command.unitSalePriceCents),
          ),
        );
  const { verdict, priority } = classifyProductMargin({
    unitContributionCents,
    monthlySalesVolume: command.monthlySalesVolume,
    realMarginBasisPoints,
  });

  return {
    effectiveFixedCostCents,
    purchaseUnitCostCents: command.purchaseUnitCostCents,
    fixedAllocationCents,
    totalUnitCostCents,
    currentPriceCents: command.unitSalePriceCents,
    netRevenueCents,
    unitContributionCents,
    unitProfitCents,
    realMarginBasisPoints,
    minimumPriceCents,
    targetPriceCents,
    priceReferencesPartial: command.monthlySalesVolume === null,
    monthlySalesGoal,
    weeklySalesGoal,
    dailySalesGoal,
    breakEvenDiscountPercent,
    totalFeeBasisPoints,
    verdict,
    priority,
  };
}

export {
  PRODUCT_ABOVE_TARGET_BPS,
  PRODUCT_MARGIN_TOLERANCE_BPS,
  PRODUCT_OPERATING_DAYS_PER_WEEK,
  PRODUCT_TARGET_MARGIN_BPS,
  calculateProductReport,
  classifyProductMargin,
};
