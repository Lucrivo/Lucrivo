import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type {
  ProductionReportCalculation,
  ProductionReportPriority,
  ProductionReportVerdict,
} from "../types";
import { ceilDivide, multiplyDivideRound, roundDivide } from "./integer-math";

const RATE_SCALE = 10_000;
const PRODUCTION_ATTENTION_BAND_BPS = 2_000;
const WEEKLY_DIVISOR_HUNDREDTHS = 433;
const PRODUCTION_OPERATING_DAYS_PER_WEEK = 6;

function classifyProductionMargin(input: {
  unitContributionCents: number;
  monthlySalesVolumeUsed: number;
  effectiveFixedCostCents: number;
  monthlyResultCents: number;
  realMarginBasisPoints: number | null;
}): {
  verdict: ProductionReportVerdict;
  priority: ProductionReportPriority;
} {
  if (input.unitContributionCents <= 0) {
    return { verdict: "direct_loss", priority: "cost" };
  }
  if (input.monthlySalesVolumeUsed === 0) {
    return input.effectiveFixedCostCents > 0
      ? { verdict: "operational_loss", priority: "volume" }
      : { verdict: "no_sales", priority: "volume" };
  }
  if (input.monthlyResultCents < 0) {
    return { verdict: "operational_loss", priority: "price" };
  }
  if (input.monthlyResultCents === 0) {
    return { verdict: "break_even", priority: "margin" };
  }
  if (
    input.realMarginBasisPoints !== null &&
    input.realMarginBasisPoints < PRODUCTION_ATTENTION_BAND_BPS
  ) {
    return { verdict: "tight_margin", priority: "margin" };
  }
  return { verdict: "adequate_margin", priority: "volume" };
}

function calculateProductionReport(
  command: ProductionDiagnosisCommand,
): ProductionReportCalculation {
  const effectiveFixedCostCents = roundDivide(
    BigInt(command.fixedMonthlyExpensesCents) + BigInt(command.proLaboreCents),
    BigInt(1),
  );
  const totalFeeBasisPoints = roundDivide(
    BigInt(command.taxRateBasisPoints) + BigInt(command.cardFeeRateBasisPoints),
    BigInt(1),
  );
  const netRateBasisPoints = RATE_SCALE - totalFeeBasisPoints;
  const monthlySalesVolumeUsed = command.monthlySalesVolume ?? 0;
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
    BigInt(netRevenueCents) - BigInt(command.productionUnitCostCents),
    BigInt(1),
  );
  const fixedAllocationCents =
    monthlySalesVolumeUsed === 0
      ? null
      : ceilDivide(
          BigInt(effectiveFixedCostCents),
          BigInt(monthlySalesVolumeUsed),
        );
  const totalUnitCostCents =
    fixedAllocationCents === null
      ? null
      : roundDivide(
          BigInt(command.productionUnitCostCents) +
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
  const monthlyGrossRevenueCents = roundDivide(
    BigInt(command.unitSalePriceCents) * BigInt(monthlySalesVolumeUsed),
    BigInt(1),
  );
  const monthlyNetRevenueCents = roundDivide(
    BigInt(netRevenueCents) * BigInt(monthlySalesVolumeUsed),
    BigInt(1),
  );
  const monthlyResultCents = roundDivide(
    BigInt(unitContributionCents) * BigInt(monthlySalesVolumeUsed) -
      BigInt(effectiveFixedCostCents),
    BigInt(1),
  );
  const realMarginBasisPoints =
    monthlyGrossRevenueCents === 0
      ? null
      : roundDivide(
          BigInt(monthlyResultCents) * BigInt(RATE_SCALE),
          BigInt(monthlyGrossRevenueCents),
        );
  const referenceCostCents =
    totalUnitCostCents ?? command.productionUnitCostCents;
  const priceReferencesPartial = command.monthlySalesVolume === null;
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
          BigInt(PRODUCTION_OPERATING_DAYS_PER_WEEK),
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
  const { verdict, priority } = classifyProductionMargin({
    unitContributionCents,
    monthlySalesVolumeUsed,
    effectiveFixedCostCents,
    monthlyResultCents,
    realMarginBasisPoints,
  });

  return {
    effectiveFixedCostCents,
    productionUnitCostCents: command.productionUnitCostCents,
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
    priceReferencesPartial,
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
  PRODUCTION_ATTENTION_BAND_BPS,
  PRODUCTION_OPERATING_DAYS_PER_WEEK,
  calculateProductionReport,
  classifyProductionMargin,
};
