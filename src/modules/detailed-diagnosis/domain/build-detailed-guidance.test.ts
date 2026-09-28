import { describe, expect, it } from "vitest";

import type { DetailedDiagnosisCommand } from "../types";
import { calculateDetailedDiagnosis } from "./calculate-detailed-diagnosis";
import { buildDetailedGuidance } from "./build-detailed-guidance";

const command: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 300_000,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 5_500,
      monthlySalesVolume: 200,
      purchaseUnitCostCents: 1_500,
      packagingUnitCostCents: 100,
    },
  ],
};

describe("buildDetailedGuidance", () => {
  it("describes positive business result without judging margin quality", () => {
    const guidance = buildDetailedGuidance(
      command,
      calculateDetailedDiagnosis(command),
    );
    expect(guidance.find(({ key }) => key === "business_result")).toMatchObject(
      { tone: "positive", title: "O resultado estimado do mês ficou positivo" },
    );
    expect(JSON.stringify(guidance)).not.toMatch(
      /margem adequada|margem apertada|boa folga|pouca folga/i,
    );
  });

  it("explains missing multi-item volumes without inventing a mix", () => {
    const partial = {
      ...command,
      items: [
        { ...command.items[0], monthlySalesVolume: 10 },
        {
          ...command.items[0],
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Caderno",
          monthlySalesVolume: null,
        },
      ],
    };
    const guidance = buildDetailedGuidance(
      partial,
      calculateDetailedDiagnosis(partial),
    );
    expect(JSON.stringify(guidance)).toContain("inventar uma proporção");
  });

  it("uses complete unit profit for factual item comparisons", () => {
    const twoItems = {
      ...command,
      items: [
        command.items[0],
        {
          ...command.items[0],
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Caderno",
          unitSalePriceCents: 6_000,
        },
      ],
    };
    const guidance = buildDetailedGuidance(
      twoItems,
      calculateDetailedDiagnosis(twoItems),
    );
    expect(
      guidance.find(({ key }) => key === "best_unit_contribution"),
    ).toMatchObject({ itemIds: [twoItems.items[1].id] });
  });
});
