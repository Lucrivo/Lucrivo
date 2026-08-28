import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type {
  ReportPriority,
  ReportResults,
  ReportUnit,
  ReportVerdict,
} from "../types";
import { ceilDivide, multiplyDivideRound, roundDivide } from "./integer-math";

const RATE_SCALE = 10_000;
const SERVICE_TARGET_MARGIN_BPS = 1_500;
const SERVICE_MARGIN_TOLERANCE_BPS = 50;
const SERVICE_ABOVE_TARGET_BPS = 300;
const WEEKLY_DIVISOR_HUNDREDTHS = 433;

type ServiceReportCalculation = ReportResults & {
  unit: ReportUnit;
  totalFeeBasisPoints: number;
  monthlyWorkMinutes: number;
};

function classifyServiceMargin(
  currentPriceCents: number,
  realMarginBasisPoints: number | null,
): ReportVerdict {
  if (currentPriceCents <= 0) return "missing_price";
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

function selectServicePriority(verdict: ReportVerdict): ReportPriority {
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
  const unit: ReportUnit =
    command.pricingMethod === "hour" ? "hour" : "appointment";
  const unitDurationMinutes =
    command.pricingMethod === "hour" ? 60 : command.appointmentDurationMinutes;
  const priceCents = currentUnitPrice(command);

  const hourCostCents =
    command.monthlyWorkMinutes > 0
      ? multiplyDivideRound(monthlyCostCents, 60, command.monthlyWorkMinutes)
      : null;
  const unitCostCents =
    command.monthlyWorkMinutes > 0 && unitDurationMinutes > 0
      ? multiplyDivideRound(
          monthlyCostCents,
          unitDurationMinutes,
          command.monthlyWorkMinutes,
        )
      : null;
  const netRevenueCents =
    priceCents > 0
      ? multiplyDivideRound(priceCents, netRateBps, RATE_SCALE)
      : null;
  const unitProfitCents =
    netRevenueCents !== null && unitCostCents !== null
      ? roundDivide(BigInt(netRevenueCents) - BigInt(unitCostCents), BigInt(1))
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
  const verdict = classifyServiceMargin(priceCents, realMarginBasisPoints);
  const priority = selectServicePriority(verdict);
  const canRecommendVolume =
    unitProfitCents !== null &&
    unitProfitCents > 0 &&
    priceCents > 0 &&
    netRateBps > 0;
  const monthlySalesGoal = canRecommendVolume
    ? ceilDivide(
        BigInt(monthlyCostCents) * BigInt(RATE_SCALE),
        BigInt(netRateBps) * BigInt(priceCents),
      )
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
    unitCostCents,
    currentPriceCents: priceCents,
    netRevenueCents,
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
