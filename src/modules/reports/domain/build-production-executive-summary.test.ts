import { describe, expect, it } from "vitest";

import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";
import { buildProductionExecutiveSummary } from "./build-production-executive-summary";
import { calculateProductionReport } from "./calculate-production-report";

const command: ProductionDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  costCompositionEnabled: false,
  productionUnitCostCents: 1_600,
  materialUnitCostCents: null,
  packagingUnitCostCents: null,
  directLaborUnitCostCents: null,
  otherVariableUnitCostCents: null,
  unitSalePriceCents: 5_500,
  fixedMonthlyExpensesCents: 300_000,
  monthlySalesVolume: 200,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
};

describe("buildProductionExecutiveSummary", () => {
  it("describes a positive result factually", () => {
    const summary = buildProductionExecutiveSummary(
      calculateProductionReport(command),
    );
    expect(summary.verdict.label).toBe("Resultado positivo");
    expect(JSON.stringify(summary)).toContain("Quanto sobra a cada R$ 100");
    expect(summary.answers[0]?.answer).toBe(
      "Sim. Seu lucro estimado no mês é de R$ 3.030,00, depois dos valores considerados.",
    );
  });

  it("keeps complete price unavailable without volume", () => {
    const summary = buildProductionExecutiveSummary(
      calculateProductionReport({ ...command, monthlySalesVolume: null }),
    );
    expect(summary.facts[1].referenceValue).toBe("Ainda não calculado");
    expect(summary.answers[1].answer).toMatch(/falta uma quantidade/i);
  });

  it("contains no target-based or margin-quality language", () => {
    expect(
      JSON.stringify(
        buildProductionExecutiveSummary(calculateProductionReport(command)),
      ),
    ).not.toMatch(
      /margem adequada|margem apertada|acima da meta|boa folga|pouca folga|meta de 20%|preço-alvo/i,
    );
  });
});
