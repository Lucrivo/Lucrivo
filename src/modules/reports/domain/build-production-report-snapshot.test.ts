import { describe, expect, it } from "vitest";

import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";
import { parseProductionReportSnapshot } from "../schemas/production-report-snapshot.schema";
import { buildProductionReportSnapshot } from "./build-production-report-snapshot";
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

function build(input: ProductionDiagnosisCommand) {
  return buildProductionReportSnapshot(input, calculateProductionReport(input));
}

describe("buildProductionReportSnapshot", () => {
  it("builds the Production 3/3/5 contract with direct summary language", () => {
    const snapshot = build(command);
    const content = JSON.stringify(snapshot);

    expect(snapshot).toMatchObject({
      schemaVersion: 3,
      calculationVersion: 3,
      contentVersion: 5,
      results: {
        minimumPriceCents: 3_871,
        unitProfitCents: 1_515,
        realMarginBasisPoints: 2_755,
        verdict: "positive_result",
      },
      discountSimulationBase: {
        unitCostCents: 3_600,
        minimumPriceCents: 3_871,
      },
    });
    expect(content).toContain("Quanto esta unidade custa");
    expect(content).toContain("Parte dos gastos do mês");
    expect(content).toContain("Custo completo por unidade");
    expect(content).toContain("Quanto sobra por venda");
    expect(parseProductionReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it("shows only the monthly quantity when volume is unknown", () => {
    const snapshot = build({ ...command, monthlySalesVolume: null });
    const content = JSON.stringify(snapshot);

    expect(snapshot.results).toMatchObject({
      minimumPriceCents: null,
      totalUnitCostCents: null,
      unitProfitCents: null,
      realMarginBasisPoints: null,
      monthlySalesGoal: 114,
    });
    expect(snapshot.discountSimulationBase.unitCostCents).toBeNull();
    expect(content).toContain("não dividimos os gastos do mês");
    expect(content).not.toMatch(/por semana|por dia/);
  });

  it("keeps composed manufacturing costs in plain language", () => {
    const content = JSON.stringify(
      build({
        ...command,
        costCompositionEnabled: true,
        materialUnitCostCents: 1_000,
        packagingUnitCostCents: 200,
        directLaborUnitCostCents: 300,
        otherVariableUnitCostCents: 100,
      }),
    );
    expect(content).toMatch(
      /materiais|embalagem|trabalho por unidade|outros valores/,
    );
  });

  it("contains no target-based or margin-quality language", () => {
    expect(JSON.stringify(build(command))).not.toMatch(
      /margem adequada|margem apertada|acima da meta|boa folga|pouca folga|meta de 15%|meta de 20%|preço-alvo/i,
    );
  });
});
