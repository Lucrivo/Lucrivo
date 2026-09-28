import type { CurrentDetailedReportSnapshot } from "../types";
import { ceilDivide } from "./integer-math";

type DetailedSalesGoal =
  | { available: true; monthly: number; weekly: number; daily: number }
  | { available: false; reason: string };

function calculateDetailedSalesGoal(
  inputs: CurrentDetailedReportSnapshot["inputs"],
  results: CurrentDetailedReportSnapshot["results"],
  policy: Pick<
    CurrentDetailedReportSnapshot["policy"],
    "weeklyDivisorHundredths" | "operatingDaysPerWeek"
  >,
): DetailedSalesGoal {
  if (results.isPartial) {
    return {
      available: false,
      reason: "Informe as vendas mensais de todos os itens para calcular.",
    };
  }

  const totalVolume = inputs.items.reduce(
    (sum, item) => sum + (item.monthlySalesVolume ?? 0),
    0,
  );

  if (totalVolume <= 0) {
    return {
      available: false,
      reason: "Informe uma quantidade vendida maior que zero para calcular.",
    };
  }

  if (
    results.monthlyContributionCents === null ||
    results.monthlyContributionCents <= 0
  ) {
    return {
      available: false,
      reason:
        "As vendas informadas não deixam valor suficiente para calcular uma meta.",
    };
  }

  const monthly = ceilDivide(
    BigInt(results.effectiveFixedCostCents) * BigInt(totalVolume),
    BigInt(results.monthlyContributionCents),
  );
  const weekly = ceilDivide(
    BigInt(monthly) * BigInt(100),
    BigInt(policy.weeklyDivisorHundredths),
  );
  const daily = ceilDivide(BigInt(weekly), BigInt(policy.operatingDaysPerWeek));

  return { available: true, monthly, weekly, daily };
}

export { calculateDetailedSalesGoal, type DetailedSalesGoal };
