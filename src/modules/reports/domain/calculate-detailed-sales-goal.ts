import { ceilDivide } from "./integer-math";

type DetailedSalesGoalInputs = {
  items: ReadonlyArray<{ monthlySalesVolume: number | null }>;
};

type DetailedSalesGoalResults = {
  effectiveFixedCostCents: number;
  isPartial: boolean;
  items: ReadonlyArray<{ unitContributionCents: number }>;
  monthlyContributionCents: number | null;
};

type DetailedSalesGoalPolicy = {
  weeklyDivisorHundredths: number;
  operatingDaysPerWeek: number;
};

type DetailedSalesGoal =
  | {
      available: true;
      monthly: number;
      weekly: number | null;
      daily: number | null;
      basedOnKnownMix: boolean;
    }
  | { available: false; reason: string };

function calculateDetailedSalesGoal(
  inputs: DetailedSalesGoalInputs,
  results: DetailedSalesGoalResults,
  policy: DetailedSalesGoalPolicy,
): DetailedSalesGoal {
  if (results.isPartial) {
    if (inputs.items.length !== 1) {
      return {
        available: false,
        reason:
          "Para calcular uma quantidade única, informe as vendas mensais de todos os itens.",
      };
    }

    const itemContributionCents = results.items[0]?.unitContributionCents;
    if (itemContributionCents === undefined || itemContributionCents <= 0) {
      return {
        available: false,
        reason:
          "No preço atual, este item ainda não deixa valor para pagar os gastos do mês.",
      };
    }

    return {
      available: true,
      monthly: ceilDivide(
        BigInt(results.effectiveFixedCostCents),
        BigInt(itemContributionCents),
      ),
      weekly: null,
      daily: null,
      basedOnKnownMix: false,
    };
  }

  const totalVolume = inputs.items.reduce(
    (sum, item) => sum + (item.monthlySalesVolume ?? 0),
    0,
  );
  if (totalVolume <= 0) {
    return {
      available: false,
      reason:
        "Informe uma quantidade vendida maior que zero para mostrar a proporção entre os itens.",
    };
  }
  if (
    results.monthlyContributionCents === null ||
    results.monthlyContributionCents <= 0
  ) {
    return {
      available: false,
      reason:
        "As vendas informadas não deixam valor suficiente para calcular uma quantidade.",
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

  return {
    available: true,
    monthly,
    weekly,
    daily,
    basedOnKnownMix: true,
  };
}

export {
  calculateDetailedSalesGoal,
  type DetailedSalesGoal,
  type DetailedSalesGoalInputs,
  type DetailedSalesGoalPolicy,
  type DetailedSalesGoalResults,
};
