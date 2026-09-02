import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type {
  ServiceReportPriority,
  ServiceReportUnit,
  ServiceReportVerdict,
} from "../types";
import { ceilDivide, multiplyDivideRound, roundDivide } from "./integer-math";

const RATE_SCALE = 10_000;
const SERVICE_TARGET_MARGIN_BPS = 1_500;
const SERVICE_MARGIN_TOLERANCE_BPS = 50;
const SERVICE_ABOVE_TARGET_BPS = 300;
const WEEKLY_DIVISOR_HUNDREDTHS = 433;

type ServiceReportCalculation = {
  unit: ServiceReportUnit;
  totalFeeBasisPoints: number;
  monthlyWorkMinutes: number;
  monthlyCostCents: number;
  hourCostCents: number | null;
  structureUnitCostCents: number | null;
  materialUnitCostCents: number;
  unitCostCents: number | null;
  currentPriceCents: number;
  netRevenueCents: number | null;
  unitContributionCents: number | null;
  unitProfitCents: number | null;
  realMarginBasisPoints: number | null;
  minimumPriceCents: number | null;
  targetPriceCents: number | null;
  monthlySalesGoal: number | null;
  weeklySalesGoal: number | null;
  dailySalesGoal: number | null;
  breakEvenDiscountPercent: number | null;
  verdict: ServiceReportVerdict;
  priority: ServiceReportPriority;
};

function classifyServiceMargin(
  currentPriceCents: number,
  unitContributionCents: number | null,
  realMarginBasisPoints: number | null,
): ServiceReportVerdict {
  if (currentPriceCents <= 0) return "missing_price";
  if (unitContributionCents !== null && unitContributionCents <= 0) {
    return "direct_loss";
  }
  if (realMarginBasisPoints === null || realMarginBasisPoints <= 0) {
    return "operational_loss";
  }
  if (
    realMarginBasisPoints <
    SERVICE_TARGET_MARGIN_BPS - SERVICE_MARGIN_TOLERANCE_BPS
  ) {
    return "tight_margin";
  }
  if (
    realMarginBasisPoints <=
    SERVICE_TARGET_MARGIN_BPS + SERVICE_ABOVE_TARGET_BPS
  ) {
    return "adequate_margin";
  }
  return "above_target";
}

function selectServicePriority(
  verdict: ServiceReportVerdict,
): ServiceReportPriority {
  if (verdict === "direct_loss") return "cost";
  if (verdict === "missing_price" || verdict === "operational_loss") {
    return "price";
  }
  if (verdict === "tight_margin") return "margin";
  return "volume";
}

function currentUnitPrice(command: ServiceDiagnosisCommand): number {
  if (command.pricingMethod === "hour") return command.hourlyRateCents;
  if (command.pricingMethod === "appointment") {
    return command.appointmentRateCents;
  }
  return multiplyDivideRound(
    command.minuteRateCents,
    command.appointmentDurationMinutes,
    1,
  );
}

function calculateServiceReport(
  command: ServiceDiagnosisCommand,
): ServiceReportCalculation {
  const monthlyCostCents = roundDivide(
    BigInt(command.fixedMonthlyExpensesCents) +
      BigInt(command.desiredMonthlyIncomeCents),
    BigInt(1),
  );
  const totalFeeBasisPoints = roundDivide(
    BigInt(command.taxRateBasisPoints) + BigInt(command.cardFeeRateBasisPoints),
    BigInt(1),
  );
  const netRateBps = RATE_SCALE - totalFeeBasisPoints;
  const targetRateBps = netRateBps - SERVICE_TARGET_MARGIN_BPS;
  const unit: ServiceReportUnit =
    command.pricingMethod === "hour" ? "hour" : "appointment";
  const unitDurationMinutes =
    command.pricingMethod === "hour" ? 60 : command.appointmentDurationMinutes;
  const priceCents = currentUnitPrice(command);

  const hourCostCents =
    command.monthlyWorkMinutes > 0
      ? multiplyDivideRound(monthlyCostCents, 60, command.monthlyWorkMinutes)
      : null;
  const structureUnitCostCents =
    command.monthlyWorkMinutes > 0 && unitDurationMinutes > 0
      ? multiplyDivideRound(
          monthlyCostCents,
          unitDurationMinutes,
          command.monthlyWorkMinutes,
        )
      : null;
  const unitCostCents =
    structureUnitCostCents === null
      ? null
      : roundDivide(
          BigInt(structureUnitCostCents) +
            BigInt(command.materialUnitCostCents),
          BigInt(1),
        );
  const netRevenueCents =
    priceCents > 0
      ? multiplyDivideRound(priceCents, netRateBps, RATE_SCALE)
      : null;
  const unitContributionCents =
    netRevenueCents === null
      ? null
      : roundDivide(
          BigInt(netRevenueCents) - BigInt(command.materialUnitCostCents),
          BigInt(1),
        );
  const unitProfitCents =
    unitContributionCents !== null && structureUnitCostCents !== null
      ? roundDivide(
          BigInt(unitContributionCents) - BigInt(structureUnitCostCents),
          BigInt(1),
        )
      : null;
  const realMarginBasisPoints =
    unitProfitCents !== null && priceCents > 0
      ? roundDivide(
          BigInt(unitProfitCents) * BigInt(RATE_SCALE),
          BigInt(priceCents),
        )
      : null;
  const minimumPriceCents =
    unitCostCents !== null && netRateBps > 0
      ? ceilDivide(
          BigInt(unitCostCents) * BigInt(RATE_SCALE),
          BigInt(netRateBps),
        )
      : null;
  const targetPriceCents =
    unitCostCents !== null && targetRateBps > 0
      ? ceilDivide(
          BigInt(unitCostCents) * BigInt(RATE_SCALE),
          BigInt(targetRateBps),
        )
      : null;
  const verdict = classifyServiceMargin(
    priceCents,
    unitContributionCents,
    realMarginBasisPoints,
  );
  const priority = selectServicePriority(verdict);
  const monthlySalesGoal =
    unitContributionCents !== null && unitContributionCents > 0
      ? ceilDivide(BigInt(monthlyCostCents), BigInt(unitContributionCents))
      : null;
  const weeklySalesGoal =
    monthlySalesGoal !== null
      ? ceilDivide(
          BigInt(monthlySalesGoal) * BigInt(100),
          BigInt(WEEKLY_DIVISOR_HUNDREDTHS),
        )
      : null;
  const dailySalesGoal =
    weeklySalesGoal !== null && command.weeklyWorkDays > 0
      ? ceilDivide(BigInt(weeklySalesGoal), BigInt(command.weeklyWorkDays))
      : null;
  const breakEvenDiscountPercent =
    minimumPriceCents !== null && priceCents > 0
      ? Math.max(
          0,
          roundDivide(
            BigInt(priceCents - minimumPriceCents) * BigInt(100),
            BigInt(priceCents),
          ),
        )
      : null;

  return {
    unit,
    totalFeeBasisPoints,
    monthlyWorkMinutes: command.monthlyWorkMinutes,
    monthlyCostCents,
    hourCostCents,
    structureUnitCostCents,
    materialUnitCostCents: command.materialUnitCostCents,
    unitCostCents,
    currentPriceCents: priceCents,
    netRevenueCents,
    unitContributionCents,
    unitProfitCents,
    realMarginBasisPoints,
    minimumPriceCents,
    targetPriceCents,
    monthlySalesGoal,
    weeklySalesGoal,
    dailySalesGoal,
    breakEvenDiscountPercent,
    verdict,
    priority,
  };
}

export {
  RATE_SCALE,
  SERVICE_TARGET_MARGIN_BPS,
  calculateServiceReport,
  classifyServiceMargin,
  selectServicePriority,
  type ServiceReportCalculation,
};
