import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";
import type {
  NormalizedServiceDiagnosisCommand,
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";
import { buildDetailedReportSnapshot } from "@/modules/reports/domain/build-detailed-report-snapshot";
import { buildProductReportSnapshot } from "@/modules/reports/domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "@/modules/reports/domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "@/modules/reports/domain/build-service-report-snapshot";
import { calculateProductReport } from "@/modules/reports/domain/calculate-product-report";
import { calculateProductionReport } from "@/modules/reports/domain/calculate-production-report";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";
import type { OwnedReport } from "@/modules/reports/services/get-report.service";

import { buildReportAiContext } from "./build-report-ai-context";

const serviceCommand: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7_794,
  weeklyWorkDays: 5,
  hourlyRateCents: 8_000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "hour",
    currentPriceCents: 8_000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};

const productCommand: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  productKind: "resale",
  purchaseUnitCostCents: 5_000,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const productionCommand: ProductionDiagnosisCommand = {
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  costCompositionEnabled: true,
  productionUnitCostCents: 5_000,
  materialUnitCostCents: 3_000,
  packagingUnitCostCents: 500,
  directLaborUnitCostCents: 1_000,
  otherVariableUnitCostCents: 500,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const detailedCommand: DetailedDiagnosisCommand = {
  submissionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  category: "production",
  fixedMonthlyExpensesCents: 20_000,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 0,
  cardFeeRateBasisPoints: 0,
  items: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      position: 0,
      name: "Bolo de festa",
      kind: "manufacturing",
      costMode: "technical_sheet",
      unitSalePriceCents: 15_000,
      monthlySalesVolume: 10,
      recipeYield: 10,
      lossRateBasisPoints: 1_000,
      packagingUnitCostCents: 100,
      directLaborUnitCostCents: 500,
      otherVariableUnitCostCents: 250,
      ingredients: [
        {
          id: "44444444-4444-4444-8444-444444444444",
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

const snapshots = [
  buildServiceReportSnapshot(
    serviceCommand,
    calculateServiceReport(serviceCommand),
  ),
  buildProductReportSnapshot(
    productCommand,
    calculateProductReport(productCommand),
  ),
  buildProductionReportSnapshot(
    productionCommand,
    calculateProductionReport(productionCommand),
  ),
  buildDetailedReportSnapshot(
    detailedCommand,
    calculateDetailedDiagnosis(detailedCommand),
  ),
] as const;

function ownedReport(snapshot: (typeof snapshots)[number]): OwnedReport {
  return {
    id: 42,
    version: 3,
    createdAt: "2026-09-29T12:00:00.000Z",
    updatedAt: "2026-09-29T12:00:00.000Z",
    snapshot,
  };
}

describe("buildReportAiContext", () => {
  it.each(snapshots)(
    "projects visible $category report content without internal metadata",
    (snapshot) => {
      const context = buildReportAiContext(ownedReport(snapshot));
      const parsed = JSON.parse(context) as Record<string, unknown>;

      expect(parsed).toMatchObject({
        reportId: 42,
        reportVersion: 3,
        category: snapshot.category,
        scenario: snapshot.scenario,
        identity: expect.any(Object),
        executiveSummary: expect.any(Object),
        numbers: expect.any(Array),
        sections: expect.any(Array),
      });
      expect(context).toContain("R$");
      expect(context).not.toContain("user_id");
      expect(context).not.toContain("billing_contracts");
      expect(context).not.toContain("submissionId");
      expect(context).not.toContain('"inputs"');
      expect(context).not.toContain('"policy"');
      expect(context).not.toContain('"help"');
      expect(context).not.toContain("triggerLabel");
      expect(context).not.toContain("technicalTerm");
    },
  );

  it("includes detailed comparison and guidance while removing item IDs", () => {
    const context = buildReportAiContext(ownedReport(snapshots[3]));
    const parsed = JSON.parse(context) as {
      comparison: unknown[];
      items: unknown[];
      secondaryGuidance: unknown[];
    };

    expect(parsed.comparison).not.toHaveLength(0);
    expect(parsed.items).not.toHaveLength(0);
    expect(parsed.secondaryGuidance).not.toHaveLength(0);
    expect(context).toContain("Bolo de festa");
    expect(context).toContain("Farinha");
    expect(context).not.toContain("33333333-3333-4333-8333-333333333333");
    expect(context).not.toContain("44444444-4444-4444-8444-444444444444");
    expect(context).not.toContain("discountSimulationBase");
  });
});
