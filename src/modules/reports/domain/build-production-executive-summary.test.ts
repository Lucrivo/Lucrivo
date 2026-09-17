import { describe, expect, it } from "vitest";

import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildProductionExecutiveSummary } from "./build-production-executive-summary";
import { calculateProductionReport } from "./calculate-production-report";

const command: ProductionDiagnosisCommand = {
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

describe("buildProductionExecutiveSummary", () => {
  it.each([
    ["direct_loss", "Prejuízo por venda"],
    ["operational_loss", "Prejuízo no mês"],
    ["no_sales", "Sem vendas no mês"],
    ["break_even", "No limite"],
    ["tight_margin", "Margem apertada"],
    ["adequate_margin", "Lucro"],
  ] as const)("presents %s as %s", (verdict, label) => {
    const calculation = calculateProductionReport(command);
    expect(
      buildProductionExecutiveSummary({ ...calculation, verdict }).verdict
        .label,
    ).toBe(label);
  });

  it("uses manufacturing and sold-unit wording", () => {
    const summary = buildProductionExecutiveSummary(
      calculateProductionReport(command),
    );
    const content = JSON.stringify(summary);
    expect(summary.headline).toBe("Sua produção dá lucro?");
    expect(content).toContain("custo de fabricação");
    expect(content).toContain("unidades vendidas");
    expect(content).not.toMatch(
      /custo de compra|fornecedor|produto digital|unidades produzidas por mês/i,
    );
    expect(content).not.toMatch(
      /ponto de equilíbrio|pró-labore|alíquota|rateio|receita líquida|margem de contribuição|preço-alvo|custo operacional|meta de 20%|margem ideal/i,
    );
  });

  it("keeps an unknown-volume month partial and neutral", () => {
    const summary = buildProductionExecutiveSummary(
      calculateProductionReport({ ...command, monthlySalesVolume: null }),
    );

    expect(summary.verdict).toMatchObject({
      label: "Falta informar as vendas",
      tone: "neutral",
    });
    expect(summary.priority.body).toContain("Informe");
    expect(summary.facts[0]).toMatchObject({
      currentValue: "Ainda não calculado",
      referenceValue: "Ainda não calculado",
    });
  });
});
