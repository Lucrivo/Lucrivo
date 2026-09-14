import { describe, expect, it } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildProductExecutiveSummary } from "./build-product-executive-summary";
import { calculateProductReport } from "./calculate-product-report";

const command: ProductDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  productKind: "resale",
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

describe("buildProductExecutiveSummary", () => {
  it.each([
    ["direct_loss", "Prejuízo por venda"],
    ["operational_loss", "Prejuízo no mês"],
    ["no_sales", "Sem vendas no mês"],
    ["break_even", "No limite"],
    ["tight_margin", "Margem apertada"],
    ["adequate_margin", "Lucro"],
  ] as const)("presents %s as %s", (verdict, label) => {
    const base = calculateProductReport(command);
    expect(
      buildProductExecutiveSummary({ ...base, verdict }).verdict.label,
    ).toBe(label);
  });

  it("explains the zero-sales month without calling a future sale profit", () => {
    const summary = buildProductExecutiveSummary(
      calculateProductReport({ ...command, monthlySalesVolume: null }),
    );
    expect(summary.facts[0]).toEqual(
      expect.objectContaining({
        currentLabel: "Resultado do mês",
        currentValue: "-R$ 3.000,00",
        referenceValue: "Sem vendas para calcular",
      }),
    );
    expect(summary.answers[0].answer).toContain("sem vendas");
    expect(summary.answers[0].answer).toContain("Uma futura venda deixa");
    expect(summary.answers[1].question).toBe("Meu preço paga tudo?");
  });

  it("uses separate Resale and Digital language", () => {
    const calculation = calculateProductReport({
      ...command,
      productKind: "digital",
      purchaseUnitCostCents: 0,
    });
    const digital = buildProductExecutiveSummary(calculation, "digital");
    const resale = buildProductExecutiveSummary(
      calculateProductReport(command),
      "resale",
    );
    expect(digital.headline).toBe("Seu produto digital dá lucro?");
    expect(JSON.stringify(digital)).toContain("custo por venda");
    expect(JSON.stringify(digital)).not.toMatch(
      /fornecedor|custo de compra|fabricação/i,
    );
    expect(resale.headline).toBe("Seu produto para revenda dá lucro?");
    expect(JSON.stringify(resale)).toContain("custo de compra");
  });

  it("keeps prohibited technical and target language out", () => {
    const content = JSON.stringify(
      buildProductExecutiveSummary(calculateProductReport(command)),
    );
    expect(content).not.toMatch(
      /ponto de equilíbrio|pró-labore|alíquota|rateio|receita líquida|margem de contribuição|preço-alvo|custo operacional|meta de 20%|margem ideal/i,
    );
  });
});
