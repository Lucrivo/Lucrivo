import { describe, expect, it } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";
import { buildProductExecutiveSummary } from "./build-product-executive-summary";
import { calculateProductReport } from "./calculate-product-report";

const command: ProductDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  productKind: "resale",
  purchaseUnitCostCents: 1_600,
  unitSalePriceCents: 5_500,
  fixedMonthlyExpensesCents: 300_000,
  monthlySalesVolume: 200,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
};

describe("buildProductExecutiveSummary", () => {
  it("describes a positive result factually", () => {
    const summary = buildProductExecutiveSummary(
      calculateProductReport(command),
      "resale",
    );
    expect(summary.verdict).toMatchObject({
      label: "Resultado positivo",
      tone: "positive",
    });
    expect(JSON.stringify(summary)).toContain("Quanto sobra a cada R$ 100");
  });

  it("keeps complete price unavailable without volume", () => {
    const summary = buildProductExecutiveSummary(
      calculateProductReport({ ...command, monthlySalesVolume: null }),
      "resale",
    );
    expect(summary.facts[1].referenceValue).toBe("Ainda não calculado");
    expect(summary.answers[1].answer).toContain("falta uma quantidade");
  });

  it("contains no target-based or margin-quality language", () => {
    const summary = buildProductExecutiveSummary(
      calculateProductReport(command),
      "resale",
    );
    expect(JSON.stringify(summary)).not.toMatch(
      /margem adequada|margem apertada|acima da meta|boa folga|pouca folga|meta de 20%|preço-alvo/i,
    );
  });
});
