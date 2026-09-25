import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";

import { parseDetailedReportSnapshot } from "../schemas/detailed-report-snapshot.schema";
import { buildDetailedReportSnapshot } from "./build-detailed-report-snapshot";

const productCommand: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 200,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 0,
  cardFeeRateBasisPoints: 0,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 1000,
      monthlySalesVolume: 1,
      purchaseUnitCostCents: 500,
      packagingUnitCostCents: 0,
    },
  ],
};

const productionCommand: DetailedDiagnosisCommand = {
  ...productCommand,
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  category: "production",
  proLaboreIncluded: true,
  proLaboreCents: 100,
  items: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      position: 0,
      name: "Bolo",
      kind: "manufacturing",
      costMode: "technical_sheet",
      unitSalePriceCents: 1500,
      monthlySalesVolume: null,
      recipeYield: 10,
      lossRateBasisPoints: 1000,
      packagingUnitCostCents: 100,
      directLaborUnitCostCents: 50,
      otherVariableUnitCostCents: 25,
      ingredients: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          position: 0,
          name: "Farinha",
          quantityMillionths: 500_000,
          unit: "kg",
          unitCostTenThousandths: 50_000,
        },
      ],
    },
  ],
};

describe("buildDetailedReportSnapshot", () => {
  it("builds a complete Product snapshot with exact V1 versions", () => {
    const snapshot = buildDetailedReportSnapshot(
      productCommand,
      calculateDetailedDiagnosis(productCommand),
    );

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      calculationVersion: 1,
      contentVersion: 1,
      analysisMode: "detailed",
      category: "product",
      scenario: "resale",
      currency: "BRL",
      unit: "mix",
      policy: {
        attentionBandBasisPoints: 2000,
        concentrationThresholdBasisPoints: 4500,
        weeklyDivisorHundredths: 433,
        operatingDaysPerWeek: 6,
        proLaboreIncluded: false,
      },
    });
    expect(parseDetailedReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it("builds a partial Production snapshot with ordered normalized inputs", () => {
    const snapshot = buildDetailedReportSnapshot(
      productionCommand,
      calculateDetailedDiagnosis(productionCommand),
    );

    expect(snapshot).toMatchObject({
      category: "production",
      scenario: "manufacturing",
      results: {
        isPartial: true,
        missingVolumeItemIds: [productionCommand.items[0].id],
        monthlyGrossRevenueCents: null,
        verdict: "incomplete_volume",
      },
      guidance: [
        expect.objectContaining({ key: "missing_volume", tone: "neutral" }),
        expect.objectContaining({ key: "best_unit_contribution" }),
      ],
    });
    expect(snapshot.inputs.items[0].position).toBe(0);
    expect(
      snapshot.inputs.items[0].kind === "manufacturing" &&
        snapshot.inputs.items[0].costMode === "technical_sheet"
        ? snapshot.inputs.items[0].ingredients[0].position
        : null,
    ).toBe(0);
    expect(parseDetailedReportSnapshot(snapshot)).toEqual(snapshot);
  });
});
