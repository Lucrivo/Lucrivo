import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type {
  ProductionReportCalculation,
  ProductionReportPriority,
  ProductionReportVerdict,
} from "../types";
import { ceilDivide, multiplyDivideRound, roundDivide } from "./integer-math";

const RATE_SCALE = 10_000;
const PRODUCTION_TARGET_MARGIN_BPS = 2_000;
const PRODUCTION_MARGIN_TOLERANCE_BPS = 50;
const PRODUCTION_ABOVE_TARGET_BPS = 300;
const WEEKLY_DIVISOR_HUNDREDTHS = 433;
const PRODUCTION_OPERATING_DAYS_PER_WEEK = 6;

function classifyProductionMargin(input: {
  unitContributionCents: number;
  monthlySalesVolume: number | null;
  realMarginBasisPoints: number | null;
}): {
  verdict: ProductionReportVerdict;
  priority: ProductionReportPriority;
} {
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
    PRODUCTION_TARGET_MARGIN_BPS - PRODUCTION_MARGIN_TOLERANCE_BPS
  ) {
    return { verdict: "tight_margin", priority: "margin" };
  }
  if (
    input.realMarginBasisPoints <=
    PRODUCTION_TARGET_MARGIN_BPS + PRODUCTION_ABOVE_TARGET_BPS
  ) {
    return { verdict: "adequate_margin", priority: "volume" };
  }
  return { verdict: "above_target", priority: "volume" };
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
  const targetRateBasisPoints =
    netRateBasisPoints - PRODUCTION_TARGET_MARGIN_BPS;
  const netRevenueCents = multiplyDivideRound(
    command.unitSalePriceCents,
    netRateBasisPoints,
    RATE_SCALE,
  );
  const unitContributionCents = roundDivide(
    BigInt(netRevenueCents) - BigInt(command.productionUnitCostCents),
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
  const realMarginBasisPoints =
    unitProfitCents === null || command.unitSalePriceCents <= 0
      ? null
      : roundDivide(
          BigInt(unitProfitCents) * BigInt(RATE_SCALE),
          BigInt(command.unitSalePriceCents),
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
    monthlySalesVolume: command.monthlySalesVolume,
    realMarginBasisPoints,
  });

  return {
    effectiveFixedCostCents,
    productionUnitCostCents: command.productionUnitCostCents,
    fixedAllocationCents,
    totalUnitCostCents,
    currentPriceCents: command.unitSalePriceCents,
    netRevenueCents,
    unitContributionCents,
    unitProfitCents,
    realMarginBasisPoints,
    minimumPriceCents,
    targetPriceCents,
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
  PRODUCTION_ABOVE_TARGET_BPS,
  PRODUCTION_MARGIN_TOLERANCE_BPS,
  PRODUCTION_OPERATING_DAYS_PER_WEEK,
  PRODUCTION_TARGET_MARGIN_BPS,
  calculateProductionReport,
  classifyProductionMargin,
};
