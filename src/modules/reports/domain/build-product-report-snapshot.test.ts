import { describe, expect, it } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { parseProductReportSnapshot } from "../schemas/product-report-snapshot.schema";
import { buildProductReportSnapshot } from "./build-product-report-snapshot";
import { calculateProductReport } from "./calculate-product-report";

const completeCommand: ProductDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

function build(command: ProductDiagnosisCommand) {
  return buildProductReportSnapshot(command, calculateProductReport(command));
}

describe("buildProductReportSnapshot", () => {
  it("assembles the canonical complete Product V1 snapshot", () => {
    const calculation = calculateProductReport(completeCommand);
    const snapshot = buildProductReportSnapshot(completeCommand, calculation);

    expect(snapshot).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        calculationVersion: 1,
        contentVersion: 1,
        category: "product",
        scenario: "resale",
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
          purchaseUnitCostCents: 5000,
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
      purchaseUnitCostCents: 5000,
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
    expect(parseProductReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it("assembles the canonical partial Product V1 snapshot", () => {
    const command = { ...completeCommand, monthlySalesVolume: null };
    const snapshot = build(command);

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
    expect(parseProductReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it.each([100, null] as const)(
    "accepts a zero-cost digital Product snapshot with volume %s",
    (monthlySalesVolume) => {
      const snapshot = build({
        ...completeCommand,
        purchaseUnitCostCents: 0,
        fixedMonthlyExpensesCents: 0,
        monthlySalesVolume,
        proLaboreIncluded: false,
        proLaboreCents: 0,
      });

      expect(snapshot.inputs.purchaseUnitCostCents).toBe(0);
      expect(snapshot.results.purchaseUnitCostCents).toBe(0);
      expect(snapshot.discountSimulationBase.unitCostCents).toBe(0);
      expect(parseProductReportSnapshot(snapshot)).toEqual(snapshot);
    },
  );

  it.each([
    [completeCommand, false],
    [{ ...completeCommand, monthlySalesVolume: null }, true],
  ] as const)(
    "builds five ordered Product sections with deterministic terminology %#",
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
      expect(content).toContain("unidade");
      expect(content).toContain("custo de compra");
      expect(content).toContain("20%");
      expect(content).toContain("6 dias");
      expect(content).not.toContain("hora faturável");
      expect(content).not.toContain("atendimento");

      if (partial) {
        expect(content).toContain("sem rateio fixo");
        expect(content).toContain("contribuição por unidade");
        expect(content).not.toContain("lucro real por unidade");
      } else {
        expect(content).toContain("lucro por unidade");
        expect(content).toContain("margem real");
      }
    },
  );

  it("suppresses the volume goal when contribution is non-positive", () => {
    const snapshot = build({
      ...completeCommand,
      unitSalePriceCents: 5000,
      monthlySalesVolume: null,
    });

    expect(snapshot.results.monthlySalesGoal).toBeNull();
    expect(snapshot.sections[3].body).toContain(
      "Corrija o custo de compra ou o preço antes de buscar volume",
    );
    expect(snapshot.sections[3].body).not.toContain("meta é de");
  });
});
