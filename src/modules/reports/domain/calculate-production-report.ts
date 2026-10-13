import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type {
  ProductionReportCalculation,
  ProductionReportPriority,
  ProductionReportVerdict,
} from "../types";
import { ceilDivide, roundDivide } from "./integer-math";
import {
  calculateAllocatedUnitEconomics,
  calculateDirectUnitEconomics,
  calculateFixedAllocation,
  calculateMonthlySalesGoal,
} from "./unit-economics";

const RATE_SCALE = 10_000;
const WEEKLY_DIVISOR_HUNDREDTHS = 433;
const PRODUCTION_OPERATING_DAYS_PER_WEEK = 6;

function classifyProductionMargin(input: {
  unitContributionCents: number;
  monthlySalesVolumeUsed: number | null;
  effectiveFixedCostCents: number;
  monthlyResultCents: number | null;
  realMarginBasisPoints: number | null;
}): {
  verdict: ProductionReportVerdict;
  priority: ProductionReportPriority;
} {
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
    return { verdict: "break_even", priority: "volume" };
  }

  return { verdict: "positive_result", priority: "volume" };
}

function calculateProductionReport(
  command: ProductionDiagnosisCommand,
): ProductionReportCalculation {
  const effectiveProLaboreCents = command.proLaboreIncluded
    ? command.proLaboreCents
    : 0;
  const effectiveFixedCostCents = roundDivide(
    BigInt(command.fixedMonthlyExpensesCents) + BigInt(effectiveProLaboreCents),
    BigInt(1),
  );
  const totalFeeBasisPoints = roundDivide(
    BigInt(command.taxRateBasisPoints) + BigInt(command.cardFeeRateBasisPoints),
    BigInt(1),
  );
  const monthlySalesVolumeUsed = command.monthlySalesVolume;
  const hasKnownVolume = monthlySalesVolumeUsed !== null;
  const direct = calculateDirectUnitEconomics({
    currentPriceCents: command.unitSalePriceCents,
    directUnitCostCents: command.productionUnitCostCents,
    totalFeeBasisPoints,
  });
  const fixedAllocationCents = calculateFixedAllocation(
    effectiveFixedCostCents,
    monthlySalesVolumeUsed,
  );
  const allocated =
    fixedAllocationCents === null
      ? null
      : calculateAllocatedUnitEconomics({
          ...direct,
          currentPriceCents: command.unitSalePriceCents,
          directUnitCostCents: command.productionUnitCostCents,
          totalFeeBasisPoints,
          fixedAllocationCents,
        });
  const monthlyGrossRevenueCents = hasKnownVolume
    ? roundDivide(
        BigInt(command.unitSalePriceCents) * BigInt(monthlySalesVolumeUsed),
        BigInt(1),
      )
    : null;
  const monthlyNetRevenueCents = hasKnownVolume
    ? roundDivide(
        BigInt(direct.netRevenueCents) * BigInt(monthlySalesVolumeUsed),
        BigInt(1),
      )
    : null;
  const monthlyResultCents = hasKnownVolume
    ? roundDivide(
        BigInt(direct.unitContributionCents) * BigInt(monthlySalesVolumeUsed) -
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
  const monthlySalesGoal = calculateMonthlySalesGoal(
    effectiveFixedCostCents,
    direct.unitContributionCents,
  );
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
          BigInt(PRODUCTION_OPERATING_DAYS_PER_WEEK),
        );
  const minimumPriceCents = allocated?.minimumPriceCents ?? null;
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
    unitContributionCents: direct.unitContributionCents,
    monthlySalesVolumeUsed,
    effectiveFixedCostCents,
    monthlyResultCents,
    realMarginBasisPoints,
  });

  return {
    effectiveFixedCostCents,
    productionUnitCostCents: command.productionUnitCostCents,
    fixedAllocationCents,
    totalUnitCostCents: allocated?.totalUnitCostCents ?? null,
    currentPriceCents: command.unitSalePriceCents,
    feeAmountCents: direct.feeAmountCents,
    netRevenueCents: direct.netRevenueCents,
    unitContributionCents: direct.unitContributionCents,
    unitProfitCents: allocated?.unitProfitCents ?? null,
    monthlySalesVolumeUsed,
    monthlyGrossRevenueCents,
    monthlyNetRevenueCents,
    monthlyResultCents,
    realMarginBasisPoints,
    minimumPriceCents,
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
  PRODUCTION_OPERATING_DAYS_PER_WEEK,
  calculateProductionReport,
  classifyProductionMargin,
};
