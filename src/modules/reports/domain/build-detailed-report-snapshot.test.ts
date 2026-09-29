import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";
import { parseDetailedReportSnapshot } from "../schemas/detailed-report-snapshot.schema";
import { buildDetailedReportSnapshot } from "./build-detailed-report-snapshot";

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

function build(input: DetailedDiagnosisCommand) {
  return buildDetailedReportSnapshot(input, calculateDetailedDiagnosis(input));
}

describe("buildDetailedReportSnapshot", () => {
  it("builds the Detailed 1/1/2 contract with direct summary language", () => {
    const snapshot = build(command);
    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      calculationVersion: 1,
      contentVersion: 2,
      policy: { concentrationThresholdBasisPoints: 4_500 },
      results: {
        verdict: "positive_result",
        items: [
          {
            fixedAllocationCents: 2_000,
            totalUnitCostCents: 3_600,
            unitProfitCents: 1_515,
            realMarginBasisPoints: 2_755,
          },
        ],
      },
    });
    expect(snapshot.policy).not.toHaveProperty("attentionBandBasisPoints");
    expect(parseDetailedReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it("shows a single-item monthly goal without inventing routine splits", () => {
    const snapshot = build({
      ...command,
      items: [{ ...command.items[0], monthlySalesVolume: null }],
    });
    const sales = snapshot.sections.find(({ key }) => key === "sales_goal");
    expect(sales?.body).toContain("Como há um único item");
    expect(sales?.body).not.toMatch(/por semana|por dia/);
    expect(snapshot.results.items[0]).toMatchObject({
      fixedAllocationCents: null,
      totalUnitCostCents: null,
      unitProfitCents: null,
      realMarginBasisPoints: null,
      breakEvenUnitPriceCents: null,
    });
  });

  it("explains that a multi-item partial goal would invent a mix", () => {
    const snapshot = build({
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
    });
    expect(JSON.stringify(snapshot)).toContain("inventar uma proporção");
  });

  it("contains no target-based or margin-quality language", () => {
    expect(JSON.stringify(build(command))).not.toMatch(
      /margem adequada|margem apertada|acima da meta|boa folga|pouca folga|meta de 15%|meta de 20%|preço-alvo/i,
    );
  });
});
