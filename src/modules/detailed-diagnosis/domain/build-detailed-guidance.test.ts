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

    const guidance = buildDetailedGuidance(
      equalItems,
      calculateDetailedDiagnosis(equalItems),
    );

    expect(guidance.map(({ key }) => key)).not.toContain(
      "high_volume_low_margin",
    );
    expect(guidance.map(({ key }) => key)).not.toContain(
      "best_unit_contribution",
    );
    expect(guidance.find(({ key }) => key === "concentration")).toMatchObject({
      title: "Estes itens deixam a maior parte do valor do conjunto",
      itemIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });
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
      tone: "positive",
      itemIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });
  });

  it("describes the smaller loss without calling it a positive result", () => {
    const losingMix: DetailedDiagnosisCommand = {
      ...command,
      fixedMonthlyExpensesCents: 1_000_000,
      proLaboreIncluded: false,
      proLaboreCents: 0,
      taxRateBasisPoints: 0,
      cardFeeRateBasisPoints: 0,
      items: [
        {
          ...command.items[0]!,
          unitSalePriceCents: 5_000,
          monthlySalesVolume: 2,
          purchaseUnitCostCents: 2_000,
          packagingUnitCostCents: 0,
        },
        {
          ...command.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Caderno",
          unitSalePriceCents: 6_000,
          monthlySalesVolume: 2,
          purchaseUnitCostCents: 2_000,
          packagingUnitCostCents: 0,
        },
      ],
    };

    const guidance = buildDetailedGuidance(
      losingMix,
      calculateDetailedDiagnosis(losingMix),
    ).find(({ key }) => key === "best_unit_contribution");

    expect(guidance).toMatchObject({
      tone: "neutral",
      title: "Este item perde menos por venda do que os outros",
      itemIds: ["22222222-2222-4222-8222-222222222222"],
    });
  });

  it("does not call anyone the top seller when every quantity matches", () => {
    const sameQuantity: DetailedDiagnosisCommand = {
      ...command,
      proLaboreIncluded: false,
      items: [
        command.items[0]!,
        {
          ...command.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Caderno",
          unitSalePriceCents: 9_000,
        },
      ],
    };

    const keys = buildDetailedGuidance(
      sameQuantity,
      calculateDetailedDiagnosis(sameQuantity),
    ).map(({ key }) => key);

    expect(keys).not.toContain("high_volume_low_margin");
  });

  it("names every top seller when the whole group trails smaller items", () => {
    const mixedMargins: DetailedDiagnosisCommand = {
      ...command,
      fixedMonthlyExpensesCents: 100_000,
      proLaboreIncluded: false,
      proLaboreCents: 0,
      taxRateBasisPoints: 0,
      cardFeeRateBasisPoints: 0,
      items: [
        {
          ...command.items[0]!,
          name: "Caneca",
          unitSalePriceCents: 5_000,
          monthlySalesVolume: 100,
          purchaseUnitCostCents: 2_000,
          packagingUnitCostCents: 0,
        },
        {
          ...command.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Caderno",
          unitSalePriceCents: 8_000,
          monthlySalesVolume: 100,
          purchaseUnitCostCents: 2_000,
          packagingUnitCostCents: 0,
        },
        {
          ...command.items[0]!,
          id: "33333333-3333-4333-8333-333333333333",
          position: 2,
          name: "Garrafa",
          unitSalePriceCents: 20_000,
          monthlySalesVolume: 10,
          purchaseUnitCostCents: 2_000,
          packagingUnitCostCents: 0,
        },
      ],
    };

    const guidance = buildDetailedGuidance(
      mixedMargins,
      calculateDetailedDiagnosis(mixedMargins),
    ).find(({ key }) => key === "high_volume_low_margin");

    expect(guidance).toMatchObject({
      title: "Os itens mais vendidos deixam menos proporcionalmente",
      itemIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    });
    expect(guidance?.body).toMatch(/^Caneca e Caderno têm/);
  });

  it("omits the top-seller card when one leader does not trail the smaller items", () => {
    const splitLeaders: DetailedDiagnosisCommand = {
      ...command,
      fixedMonthlyExpensesCents: 100_000,
      proLaboreIncluded: false,
      proLaboreCents: 0,
      taxRateBasisPoints: 0,
      cardFeeRateBasisPoints: 0,
      items: [
        {
          ...command.items[0]!,
          unitSalePriceCents: 4_000,
          monthlySalesVolume: 100,
          purchaseUnitCostCents: 2_000,
          packagingUnitCostCents: 0,
        },
        {
          ...command.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Caderno",
          unitSalePriceCents: 20_000,
          monthlySalesVolume: 100,
          purchaseUnitCostCents: 1_000,
          packagingUnitCostCents: 0,
        },
        {
          ...command.items[0]!,
          id: "33333333-3333-4333-8333-333333333333",
          position: 2,
          name: "Garrafa",
          unitSalePriceCents: 10_000,
          monthlySalesVolume: 10,
          purchaseUnitCostCents: 2_000,
          packagingUnitCostCents: 0,
        },
      ],
    };

    const keys = buildDetailedGuidance(
      splitLeaders,
      calculateDetailedDiagnosis(splitLeaders),
    ).map(({ key }) => key);

    expect(keys).not.toContain("high_volume_low_margin");
  });

  it("names every item in a direct loss instead of stopping at the first", () => {
    const losses: DetailedDiagnosisCommand = {
      ...command,
      proLaboreIncluded: false,
      taxRateBasisPoints: 0,
      cardFeeRateBasisPoints: 0,
      items: ["Caneca", "Caderno", "Garrafa", "Prato"].map(
        (name, position) => ({
          ...command.items[0]!,
          id: `00000000-0000-4000-8000-${String(position + 1).padStart(12, "0")}`,
          position,
          name,
          unitSalePriceCents: 1_000,
          purchaseUnitCostCents: 5_000,
          packagingUnitCostCents: 0,
        }),
      ),
    };

    const guidance = buildDetailedGuidance(
      losses,
      calculateDetailedDiagnosis(losses),
    ).find(({ key }) => key === "direct_loss");

    expect(guidance).toMatchObject({
      title: "Há itens que não pagam seus valores diretos",
      itemIds: losses.items.map((item) => item.id),
    });
    expect(guidance?.body).toBe(
      "Caneca, Caderno e outros 2 itens não deixam valor para os gastos do mês no preço atual. Revise preço ou custo antes de ampliar as vendas.",
    );
  });
});
