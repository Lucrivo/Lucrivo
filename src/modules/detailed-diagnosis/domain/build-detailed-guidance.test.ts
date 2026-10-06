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

  it("does not single out the first item when every comparison is tied", () => {
    const equalItems: DetailedDiagnosisCommand = {
      ...command,
      items: [
        command.items[0]!,
        {
          ...command.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Caderno",
        },
      ],
    };

    const keys = buildDetailedGuidance(
      equalItems,
      calculateDetailedDiagnosis(equalItems),
    ).map(({ key }) => key);

    expect(keys).not.toContain("high_volume_low_margin");
    expect(keys).not.toContain("best_unit_contribution");
    expect(keys).not.toContain("concentration");
  });

  it("lists every highest-volume item with a strictly lower margin", () => {
    const tiedHighestVolume: DetailedDiagnosisCommand = {
      ...command,
      items: [
        command.items[0]!,
        {
          ...command.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Caderno",
        },
        {
          ...command.items[0]!,
          id: "33333333-3333-4333-8333-333333333333",
          position: 2,
          name: "Garrafa",
          unitSalePriceCents: 8_000,
          monthlySalesVolume: 50,
        },
      ],
    };

    const guidance = buildDetailedGuidance(
      tiedHighestVolume,
      calculateDetailedDiagnosis(tiedHighestVolume),
    ).find(({ key }) => key === "high_volume_low_margin");

    expect(guidance).toMatchObject({
      title: "Os itens mais vendidos deixam menos proporcionalmente",
      itemIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });
  });

  it("lists tied best unit results only when another item is strictly lower", () => {
    const tiedBest: DetailedDiagnosisCommand = {
      ...command,
      items: [
        command.items[0]!,
        {
          ...command.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Caderno",
        },
        {
          ...command.items[0]!,
          id: "33333333-3333-4333-8333-333333333333",
          position: 2,
          name: "Garrafa",
          unitSalePriceCents: 4_500,
        },
      ],
    };

    const guidance = buildDetailedGuidance(
      tiedBest,
      calculateDetailedDiagnosis(tiedBest),
    ).find(({ key }) => key === "best_unit_contribution");

    expect(guidance).toMatchObject({
      title: "Estes itens deixam mais depois dos valores considerados",
      itemIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });
  });
});
