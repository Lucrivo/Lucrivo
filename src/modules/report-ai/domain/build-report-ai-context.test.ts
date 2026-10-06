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
import type {
  ReportAiContextV2,
  ReportAiFact,
} from "./report-ai-context.types";

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

function buildProductSnapshot(
  overrides: Partial<ProductDiagnosisCommand> = {},
) {
  const command: ProductDiagnosisCommand = {
    ...productCommand,
    fixedMonthlyExpensesCents: 3_000,
    proLaboreIncluded: false,
    proLaboreCents: 0,
    ...overrides,
  };
  return buildProductReportSnapshot(command, calculateProductReport(command));
}

function buildDetailedSnapshot({
  monthlySalesVolume = 10,
}: {
  monthlySalesVolume?: number | null;
} = {}) {
  const command: DetailedDiagnosisCommand = {
    ...detailedCommand,
    items: detailedCommand.items.map((item) => ({
      ...item,
      monthlySalesVolume,
    })),
  };
  return buildDetailedReportSnapshot(
    command,
    calculateDetailedDiagnosis(command),
  );
}

function parseContext(snapshot: (typeof snapshots)[number]): ReportAiContextV2 {
  return JSON.parse(
    buildReportAiContext(ownedReport(snapshot)),
  ) as ReportAiContextV2;
}

function fact(context: ReportAiContextV2, key: string): ReportAiFact {
  const found = context.facts.find((entry) => entry.key === key);
  if (!found) throw new Error(`Missing fact: ${key}`);
  return found;
}

function itemFact(
  context: ReportAiContextV2,
  itemName: string,
  key: string,
): ReportAiFact {
  const found = context.items
    ?.find(({ name }) => name === itemName)
    ?.facts.find((entry) => entry.key === key);
  if (!found) throw new Error(`Missing item fact: ${itemName}/${key}`);
  return found;
}

describe("buildReportAiContext", () => {
  it.each(snapshots.slice(0, 3))(
    "builds semantic V2 context for quick $category reports",
    (snapshot) => {
      const parsed = JSON.parse(
        buildReportAiContext(ownedReport(snapshot)),
      ) as ReportAiContextV2;

      expect(parsed).toMatchObject({
        schemaVersion: 2,
        report: {
          id: 42,
          version: 3,
          category: snapshot.category,
          scenario: snapshot.scenario,
          analysisMode: "quick",
        },
        diagnosis: {
          verdict: snapshot.results.verdict,
          priority: snapshot.results.priority,
          partial: false,
        },
        facts: expect.any(Array),
        availability: expect.any(Object),
        explanations: {
          executiveSummary: expect.any(Object),
          sections: expect.any(Array),
          guidance: [],
          comparison: [],
        },
      });
    },
  );

  it("distinguishes unknown volume from a known month with zero sales", () => {
    const unknown = buildProductSnapshot({ monthlySalesVolume: null });
    const zero = buildProductSnapshot({ monthlySalesVolume: 0 });

    expect(parseContext(unknown).availability.volume).toBe("unknown");
    expect(parseContext(zero).availability.volume).toBe("known_zero");
    expect(parseContext(unknown).diagnosis.partial).toBe(true);
    expect(parseContext(zero).diagnosis.partial).toBe(false);
    expect(fact(parseContext(unknown), "monthly_result").value).toBeNull();
    expect(fact(parseContext(zero), "monthly_result").value).toBe("-R$ 30,00");
    expect(parseContext(unknown).availability.reasons).toContain(
      "Sem a quantidade vendida, o relatório mostra o ponto de equilíbrio como referência, nunca como resultado do mês.",
    );
    expect(
      fact(parseContext(unknown), "break_even_reference_volume").value,
    ).not.toBeNull();
    expect(
      parseContext(zero).facts.some(
        ({ key }) => key === "break_even_reference_volume",
      ),
    ).toBe(false);
  });

  it("exposes quick-report facts without private or internal input fields", () => {
    const context = buildReportAiContext(ownedReport(snapshots[1]));

    expect(context).toContain('"verdict":"positive_result"');
    expect(context).toContain('"priority":"volume"');
    expect(context).not.toContain("submissionId");
    expect(context).not.toContain('"inputs"');
    expect(context).not.toContain('"policy"');
  });

  it("builds detailed business and item facts without duplicating business costs", () => {
    const context = parseContext(snapshots[3]);

    expect(context).toMatchObject({
      schemaVersion: 2,
      report: { analysisMode: "detailed", unit: "mix" },
      diagnosis: {
        verdict: snapshots[3].results.verdict,
        priority: snapshots[3].results.priority,
        partial: snapshots[3].results.isPartial,
      },
    });
    expect(fact(context, "effective_fixed_cost").scope).toBe("business");
    expect(context.items).toHaveLength(1);
    expect(context.items?.[0]).toMatchObject({
      name: "Bolo de festa",
      directLoss: false,
      facts: expect.any(Array),
    });
    expect(
      context.items?.[0]?.facts.some(
        ({ key }) => key === "effective_fixed_cost",
      ),
    ).toBe(false);
  });

  it("names missing-volume items and keeps dependent facts unavailable", () => {
    const partialSnapshot = buildDetailedSnapshot({
      monthlySalesVolume: null,
    });
    const context = parseContext(partialSnapshot);

    expect(context.diagnosis.partial).toBe(true);
    expect(context.availability.volume).toBe("unknown");
    expect(context.availability.reasons).toContain(
      "Sem as vendas mensais de Bolo de festa, o relatório mostra o ponto de equilíbrio desse item como referência, nunca como resultado do mês.",
    );
    expect(
      itemFact(context, "Bolo de festa", "total_unit_cost").value,
    ).toBeNull();
    expect(fact(context, "monthly_result").value).toBeNull();
  });

  it("removes item and ingredient identifiers from detailed context", () => {
    const serialized = buildReportAiContext(ownedReport(snapshots[3]));
    expect(serialized).toContain("Bolo de festa");
    expect(serialized).toContain("Farinha");
    expect(serialized).not.toContain("33333333-3333-4333-8333-333333333333");
    expect(serialized).not.toContain("44444444-4444-4444-8444-444444444444");
  });
});
