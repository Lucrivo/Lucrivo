import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type {
  ProductReportCalculation,
  ProductReportPriority,
  ProductReportVerdict,
} from "../types";
import { ceilDivide, multiplyDivideRound, roundDivide } from "./integer-math";

const RATE_SCALE = 10_000;
const PRODUCT_ATTENTION_BAND_BPS = 2_000;
const WEEKLY_DIVISOR_HUNDREDTHS = 433;
const PRODUCT_OPERATING_DAYS_PER_WEEK = 6;

function classifyProductMargin(input: {
  unitContributionCents: number;
  monthlySalesVolumeUsed: number | null;
  effectiveFixedCostCents: number;
  monthlyResultCents: number | null;
  realMarginBasisPoints: number | null;
}): { verdict: ProductReportVerdict; priority: ProductReportPriority } {
  if (input.unitContributionCents <= 0) {
    return { verdict: "direct_loss", priority: "cost" };
  }
  if (input.monthlySalesVolumeUsed === null) {
    return { verdict: "incomplete_volume", priority: "data" };
  }
  if (input.monthlySalesVolumeUsed === 0) {
    return { verdict: "no_sales", priority: "volume" };
  }
  if (input.monthlyResultCents !== null && input.monthlyResultCents < 0) {
    return { verdict: "operational_loss", priority: "price" };
  }
  if (input.monthlyResultCents === 0) {
    return { verdict: "break_even", priority: "margin" };
  }
  if (
    input.realMarginBasisPoints !== null &&
    input.realMarginBasisPoints < PRODUCT_ATTENTION_BAND_BPS
  ) {
    return { verdict: "tight_margin", priority: "margin" };
  }
  return { verdict: "adequate_margin", priority: "volume" };
}

function calculateProductReport(
  command: ProductDiagnosisCommand,
): ProductReportCalculation {
  const effectiveFixedCostCents = roundDivide(
    BigInt(command.fixedMonthlyExpensesCents) + BigInt(command.proLaboreCents),
    BigInt(1),
  );
  const totalFeeBasisPoints = roundDivide(
    BigInt(command.taxRateBasisPoints) + BigInt(command.cardFeeRateBasisPoints),
    BigInt(1),
  );
  const netRateBasisPoints = RATE_SCALE - totalFeeBasisPoints;
  const monthlySalesVolumeUsed = command.monthlySalesVolume;
  const hasKnownVolume = monthlySalesVolumeUsed !== null;
  const feeAmountCents = multiplyDivideRound(
    command.unitSalePriceCents,
    totalFeeBasisPoints,
    RATE_SCALE,
  );
  const netRevenueCents = roundDivide(
    BigInt(command.unitSalePriceCents) - BigInt(feeAmountCents),
    BigInt(1),
  );
  const unitContributionCents = roundDivide(
    BigInt(netRevenueCents) - BigInt(command.purchaseUnitCostCents),
    BigInt(1),
  );
  const fixedAllocationCents =
    monthlySalesVolumeUsed === null || monthlySalesVolumeUsed === 0
      ? null
      : ceilDivide(
          BigInt(effectiveFixedCostCents),
          BigInt(monthlySalesVolumeUsed),
        );
  const totalUnitCostCents =
    fixedAllocationCents === null
      ? null
      : roundDivide(
          BigInt(command.purchaseUnitCostCents) + BigInt(fixedAllocationCents),
          BigInt(1),
        );
  const unitProfitCents =
    totalUnitCostCents === null
      ? null
      : roundDivide(
          BigInt(netRevenueCents) - BigInt(totalUnitCostCents),
          BigInt(1),
        );
  const monthlyGrossRevenueCents = hasKnownVolume
    ? roundDivide(
        BigInt(command.unitSalePriceCents) * BigInt(monthlySalesVolumeUsed),
        BigInt(1),
      )
    : null;
  const monthlyNetRevenueCents = hasKnownVolume
    ? roundDivide(
        BigInt(netRevenueCents) * BigInt(monthlySalesVolumeUsed),
        BigInt(1),
      )
    : null;
  const monthlyResultCents = hasKnownVolume
    ? roundDivide(
        BigInt(unitContributionCents) * BigInt(monthlySalesVolumeUsed) -
          BigInt(effectiveFixedCostCents),
        BigInt(1),
      )
    : null;
  const realMarginBasisPoints =
    monthlyResultCents !== null &&
    monthlyGrossRevenueCents !== null &&
    monthlyGrossRevenueCents > 0
      ? roundDivide(
          BigInt(monthlyResultCents) * BigInt(RATE_SCALE),
          BigInt(monthlyGrossRevenueCents),
        )
      : null;
  const referenceCostCents =
    totalUnitCostCents ?? command.purchaseUnitCostCents;
  const minimumPriceCents =
    netRateBasisPoints > 0
      ? ceilDivide(
          BigInt(referenceCostCents) * BigInt(RATE_SCALE),
          BigInt(netRateBasisPoints),
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
    !hasKnownVolume || monthlySalesGoal === null
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
    monthlySalesVolumeUsed,
    effectiveFixedCostCents,
    monthlyResultCents,
    realMarginBasisPoints,
  });

  return {
    effectiveFixedCostCents,
    purchaseUnitCostCents: command.purchaseUnitCostCents,
    fixedAllocationCents,
    totalUnitCostCents,
    currentPriceCents: command.unitSalePriceCents,
    feeAmountCents,
    netRevenueCents,
    unitContributionCents,
    unitProfitCents,
    monthlySalesVolumeUsed,
    monthlyGrossRevenueCents,
    monthlyNetRevenueCents,
    monthlyResultCents,
    realMarginBasisPoints,
    minimumPriceCents,
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
  PRODUCT_ATTENTION_BAND_BPS,
  PRODUCT_OPERATING_DAYS_PER_WEEK,
  calculateProductReport,
  classifyProductMargin,
};
