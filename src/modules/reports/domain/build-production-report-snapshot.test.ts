import { describe, expect, it } from "vitest";

import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { parseProductionReportSnapshot } from "../schemas/production-report-snapshot.schema";
import { buildProductionReportSnapshot } from "./build-production-report-snapshot";
import { calculateProductionReport } from "./calculate-production-report";

const composedCommand: ProductionDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  costCompositionEnabled: true,
  productionUnitCostCents: 5000,
  materialUnitCostCents: 3000,
  packagingUnitCostCents: 500,
  directLaborUnitCostCents: 1000,
  otherVariableUnitCostCents: 500,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const summarizedPartialCommand: ProductionDiagnosisCommand = {
  ...composedCommand,
  costCompositionEnabled: false,
  materialUnitCostCents: null,
  packagingUnitCostCents: null,
  directLaborUnitCostCents: null,
  otherVariableUnitCostCents: null,
  monthlySalesVolume: null,
};

function build(command: ProductionDiagnosisCommand) {
  return buildProductionReportSnapshot(
    command,
    calculateProductionReport(command),
  );
}

describe("buildProductionReportSnapshot", () => {
  it("assembles the canonical complete composed Production V1 snapshot", () => {
    const calculation = calculateProductionReport(composedCommand);
    const snapshot = buildProductionReportSnapshot(
      composedCommand,
      calculation,
    );

    expect(snapshot).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        calculationVersion: 1,
        contentVersion: 1,
        category: "production",
        scenario: "manufacturing",
        currency: "BRL",
        unit: "unit",
        policy: {
          targetMarginBasisPoints: 2000,
          weeklyDivisorHundredths: 433,
          operatingDaysPerWeek: 6,
          maximumDiscountPercent: 50,
          proLaboreIncluded: true,
        },
        inputs: {
          costCompositionEnabled: true,
          productionUnitCostCents: 5000,
          materialUnitCostCents: 3000,
          packagingUnitCostCents: 500,
          directLaborUnitCostCents: 1000,
          otherVariableUnitCostCents: 500,
          unitSalePriceCents: 10000,
          fixedMonthlyExpensesCents: 100000,
          monthlySalesVolume: 100,
          proLaboreIncluded: true,
          proLaboreCents: 200000,
          taxRateBasisPoints: 600,
          cardFeeRateBasisPoints: 200,
        },
      }),
    );
    expect(snapshot.results).toEqual({
      effectiveFixedCostCents: 300000,
      productionUnitCostCents: 5000,
      fixedAllocationCents: 3000,
      totalUnitCostCents: 8000,
      currentPriceCents: 10000,
      netRevenueCents: 9200,
      unitContributionCents: 4200,
      unitProfitCents: 1200,
      realMarginBasisPoints: 1200,
      minimumPriceCents: 8696,
      targetPriceCents: 11112,
      priceReferencesPartial: false,
      monthlySalesGoal: 72,
      weeklySalesGoal: 17,
      dailySalesGoal: 3,
      breakEvenDiscountPercent: 13,
      verdict: "tight_margin",
      priority: "margin",
    });
    expect(snapshot.discountSimulationBase).toEqual({
      originalPriceCents: 10000,
      unitCostCents: 8000,
      totalFeeBasisPoints: 800,
      targetMarginBasisPoints: 2000,
      minimumPriceCents: 8696,
      partial: false,
    });
    expect(parseProductionReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it("assembles the canonical summarized partial Production V1 snapshot", () => {
    const snapshot = build(summarizedPartialCommand);

    expect(snapshot.inputs).toEqual(
      expect.objectContaining({
        costCompositionEnabled: false,
        productionUnitCostCents: 5000,
        materialUnitCostCents: null,
        packagingUnitCostCents: null,
        directLaborUnitCostCents: null,
        otherVariableUnitCostCents: null,
        monthlySalesVolume: null,
      }),
    );
    expect(snapshot.results).toEqual(
      expect.objectContaining({
        fixedAllocationCents: null,
        totalUnitCostCents: null,
        unitProfitCents: null,
        realMarginBasisPoints: null,
        minimumPriceCents: 5435,
        targetPriceCents: 6945,
        priceReferencesPartial: true,
        verdict: "incomplete_volume",
        priority: "data",
      }),
    );
    expect(snapshot.discountSimulationBase).toEqual({
      originalPriceCents: 10000,
      unitCostCents: 5000,
      totalFeeBasisPoints: 800,
      targetMarginBasisPoints: 2000,
      minimumPriceCents: 5435,
      partial: true,
    });
    expect(parseProductionReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it.each([
    [composedCommand, false],
    [summarizedPartialCommand, true],
  ] as const)(
    "builds five ordered Production sections with deterministic terminology %#",
    (command, partial) => {
      const snapshot = build(command);
      const content = snapshot.sections.map(({ body }) => body).join(" ");

      expect(snapshot.sections.map(({ key }) => key)).toEqual([
        "break_even",
        "hidden_cost",
        "margin_diagnosis",
        "sales_goal",
        "discount_simulator",
      ]);
      expect(snapshot.sections.every(({ body }) => body.length > 0)).toBe(true);
      expect(content).toContain("fabricação");
      expect(content).toContain("unidade");
      expect(content).toContain("20%");
      expect(content).toContain("6 dias");
      expect(content).not.toContain("custo de compra");
      expect(content).not.toContain("fornecedor");
      expect(content).not.toContain("hora faturável");
      expect(content).not.toContain("atendimento");

      if (partial) {
        expect(content).toContain("sem rateio fixo");
        expect(content).toContain("contribuição por unidade");
        expect(content).not.toContain("lucro real por unidade");
      } else {
        expect(content).toContain("lucro por unidade");
        expect(content).toContain("margem real");
        expect(content).toContain(
          "mão de obra direta integra o custo de fabricação",
        );
        expect(content).toContain("pró-labore integra os custos fixos");
      }
    },
  );

  it("suppresses the volume goal when contribution is non-positive", () => {
    const snapshot = build({
      ...summarizedPartialCommand,
      unitSalePriceCents: 5000,
    });

    expect(snapshot.results.monthlySalesGoal).toBeNull();
    expect(snapshot.sections[3].body).toContain(
      "Corrija o custo de fabricação ou o preço antes de buscar volume",
    );
    expect(snapshot.sections[3].body).not.toContain("meta é de");
  });

  it("rejects a calculation that does not correspond to the command", () => {
    const calculation = calculateProductionReport(composedCommand);

    expect(() =>
      buildProductionReportSnapshot(composedCommand, {
        ...calculation,
        currentPriceCents: calculation.currentPriceCents + 1,
      }),
    ).toThrow();
  });
});
