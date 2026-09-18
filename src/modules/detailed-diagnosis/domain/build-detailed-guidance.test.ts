import { describe, expect, it } from "vitest";

import type { DetailedDiagnosisCommand, DetailedProductItem } from "../types";
import { buildDetailedGuidance } from "./build-detailed-guidance";
import { calculateDetailedDiagnosis } from "./calculate-detailed-diagnosis";

const highVolumeItem: DetailedProductItem = {
  id: "11111111-1111-4111-8111-111111111111",
  position: 0,
  name: "Caneca popular",
  kind: "resale",
  unitSalePriceCents: 1000,
  monthlySalesVolume: 100,
  purchaseUnitCostCents: 800,
  packagingUnitCostCents: 0,
};

const highMarginItem: DetailedProductItem = {
  ...highVolumeItem,
  id: "22222222-2222-4222-8222-222222222222",
  position: 1,
  name: "Caneca premium",
  monthlySalesVolume: 20,
  purchaseUnitCostCents: 200,
};

function command(
  items: DetailedProductItem[],
  fixedMonthlyExpensesCents = 10_000,
): DetailedDiagnosisCommand {
  return {
    submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    category: "product",
    fixedMonthlyExpensesCents,
    proLaboreIncluded: false,
    proLaboreCents: 0,
    taxRateBasisPoints: 0,
    cardFeeRateBasisPoints: 0,
    promotionMarginBasisPoints: 1500,
    items,
  };
}

function guidanceFor(input: DetailedDiagnosisCommand) {
  const calculation = calculateDetailedDiagnosis(input);
  return buildDetailedGuidance(input, calculation);
}

describe("buildDetailedGuidance", () => {
  it("names missing-volume items with neutral guidance and skips monthly rules", () => {
    const input = command([
      { ...highVolumeItem, monthlySalesVolume: null },
      highMarginItem,
    ]);
    const guidance = guidanceFor(input);

    expect(guidance[0]).toMatchObject({
      key: "missing_volume",
      tone: "neutral",
      itemIds: [highVolumeItem.id],
    });
    expect(guidance[0].body).toContain("Caneca popular");
    expect(guidance.map(({ key }) => key)).not.toContain("business_result");
    expect(guidance.map(({ key }) => key)).not.toContain("concentration");
    expect(guidance.map(({ key }) => key)).not.toContain(
      "high_volume_low_margin",
    );
  });

  it("identifies one or multiple direct-loss items", () => {
    const lossA = {
      ...highVolumeItem,
      purchaseUnitCostCents: 1000,
      name: "Item sem sobra A",
    };
    const lossB = {
      ...highMarginItem,
      purchaseUnitCostCents: 1100,
      name: "Item sem sobra B",
    };

    const single = guidanceFor(command([lossA]));
    expect(single.find(({ key }) => key === "direct_loss")).toMatchObject({
      tone: "critical",
      itemIds: [lossA.id],
    });

    const multiple = guidanceFor(command([lossA, lossB]));
    const directLoss = multiple.find(({ key }) => key === "direct_loss");
    expect(directLoss?.itemIds).toEqual([lossA.id, lossB.id]);
    expect(directLoss?.body).toContain("Item sem sobra A");
    expect(directLoss?.body).toContain("Item sem sobra B");
  });

  it("uses a strict greater-than 45% concentration threshold", () => {
    const thirdItem: DetailedProductItem = {
      ...highMarginItem,
      id: "33333333-3333-4333-8333-333333333333",
      position: 2,
      name: "Caneca clássica",
    };
    const atThreshold = guidanceFor(
      command([
        {
          ...highVolumeItem,
          monthlySalesVolume: 45,
          purchaseUnitCostCents: 0,
        },
        {
          ...highMarginItem,
          monthlySalesVolume: 30,
          purchaseUnitCostCents: 0,
        },
        {
          ...thirdItem,
          monthlySalesVolume: 25,
          purchaseUnitCostCents: 0,
        },
      ]),
    );
    expect(atThreshold.map(({ key }) => key)).not.toContain("concentration");

    const aboveThreshold = guidanceFor(
      command([
        {
          ...highVolumeItem,
          monthlySalesVolume: 46,
          purchaseUnitCostCents: 0,
        },
        {
          ...highMarginItem,
          monthlySalesVolume: 29,
          purchaseUnitCostCents: 0,
        },
        {
          ...thirdItem,
          monthlySalesVolume: 25,
          purchaseUnitCostCents: 0,
        },
      ]),
    );
    expect(aboveThreshold.filter(({ key }) => key === "concentration")).toEqual(
      [
        expect.objectContaining({
          tone: "warning",
          itemIds: [highVolumeItem.id],
        }),
      ],
    );
  });

  it("highlights the best unit contribution", () => {
    const guidance = guidanceFor(command([highVolumeItem, highMarginItem]));

    expect(
      guidance.find(({ key }) => key === "best_unit_contribution"),
    ).toMatchObject({
      tone: "positive",
      itemIds: [highMarginItem.id],
    });
  });

  it("flags the highest-volume item when it has the worst positive margin", () => {
    const guidance = guidanceFor(command([highVolumeItem, highMarginItem]));

    expect(
      guidance.find(({ key }) => key === "high_volume_low_margin"),
    ).toMatchObject({
      tone: "warning",
      itemIds: [highVolumeItem.id],
    });
  });

  it("describes the consolidated business result", () => {
    const guidance = guidanceFor(
      command([highVolumeItem, highMarginItem], 10_000),
    );

    expect(guidance.find(({ key }) => key === "business_result")).toMatchObject(
      { tone: "positive", itemIds: [] },
    );
  });

  it("returns compatible rules in their specified order", () => {
    const guidance = guidanceFor(command([highVolumeItem, highMarginItem]));

    expect(guidance.map(({ key }) => key)).toEqual([
      "business_result",
      "concentration",
      "high_volume_low_margin",
      "best_unit_contribution",
    ]);
  });
});
