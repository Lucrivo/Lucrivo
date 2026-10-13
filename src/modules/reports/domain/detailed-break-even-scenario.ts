import {
  deriveBreakEvenScenario,
  type BreakEvenScenario,
} from "./break-even-scenario";
import { calculateMonthlySalesGoal } from "./unit-economics";

type DetailedScenarioInputs = {
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
  items: ReadonlyArray<{
    id: string;
    unitSalePriceCents: number;
    monthlySalesVolume: number | null;
  }>;
};

type DetailedScenarioResults = {
  isPartial: boolean;
  effectiveFixedCostCents: number;
  items: ReadonlyArray<{
    itemId: string;
    variableUnitCostCents: number;
    unitContributionCents: number;
  }>;
};

type DetailedBreakEvenScenario = {
  /** Scenario for the whole mix; only defined for a single item without volume. */
  consolidated: BreakEvenScenario | null;
  /** "If only this item were sold" reference for each item without volume. */
  byItem: Map<string, BreakEvenScenario>;
};

function deriveDetailedBreakEvenScenario(
  inputs: DetailedScenarioInputs,
  results: DetailedScenarioResults,
  policy?: { weeklyDivisorHundredths: number; operatingDaysPerWeek: number },
): DetailedBreakEvenScenario {
  const byItem = new Map<string, BreakEvenScenario>();
  if (!results.isPartial) return { consolidated: null, byItem };

  const totalFeeBasisPoints =
    inputs.taxRateBasisPoints + inputs.cardFeeRateBasisPoints;
  const resultById = new Map(
    results.items.map((item) => [item.itemId, item] as const),
  );

  for (const item of inputs.items) {
    if (item.monthlySalesVolume !== null) continue;
    const result = resultById.get(item.id);
    if (!result) continue;
    const scenario = deriveBreakEvenScenario({
      effectiveFixedCostCents: results.effectiveFixedCostCents,
      directUnitCostCents: result.variableUnitCostCents,
      currentPriceCents: item.unitSalePriceCents,
      unitContributionCents: result.unitContributionCents,
      totalFeeBasisPoints,
      monthlySalesGoal: calculateMonthlySalesGoal(
        results.effectiveFixedCostCents,
        result.unitContributionCents,
      ),
      ...(policy ? { policy } : {}),
    });
    if (scenario) byItem.set(item.id, scenario);
  }

  const single = inputs.items.length === 1 ? inputs.items[0] : undefined;
  return {
    consolidated: single ? (byItem.get(single.id) ?? null) : null,
    byItem,
  };
}

export { deriveDetailedBreakEvenScenario, type DetailedBreakEvenScenario };
