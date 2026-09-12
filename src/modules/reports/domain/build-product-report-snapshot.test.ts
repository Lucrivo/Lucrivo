import { describe, expect, it } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { parseProductReportSnapshot } from "../schemas/product-report-snapshot.schema";
import { buildProductReportSnapshot } from "./build-product-report-snapshot";
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

function build(input: ProductDiagnosisCommand) {
  return buildProductReportSnapshot(input, calculateProductReport(input));
}

describe("buildProductReportSnapshot", () => {
  it("builds and parses the Product 2/2/3 contract", () => {
    const snapshot = build(command);
    expect(snapshot).toEqual(
      expect.objectContaining({
        schemaVersion: 2,
        calculationVersion: 2,
        contentVersion: 3,
        scenario: "resale",
      }),
    );
    expect(snapshot.policy).toEqual(
      expect.objectContaining({ attentionBandBasisPoints: 2000 }),
    );
    expect(snapshot.inputs.productKind).toBe("resale");
    expect(snapshot.results).toEqual(
      expect.objectContaining({
        feeAmountCents: 800,
        monthlySalesVolumeUsed: 100,
        monthlyGrossRevenueCents: 1000000,
        monthlyNetRevenueCents: 920000,
        monthlyResultCents: 120000,
      }),
    );
    expect(snapshot.results).not.toHaveProperty("targetPriceCents");
    expect(parseProductReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it.each([
    [{ unitSalePriceCents: 5000, monthlySalesVolume: null }, "direct_loss"],
    [{ monthlySalesVolume: null }, "operational_loss"],
    [
      {
        monthlySalesVolume: null,
        fixedMonthlyExpensesCents: 0,
        proLaboreIncluded: false,
        proLaboreCents: 0,
      },
      "no_sales",
    ],
    [{ monthlySalesVolume: 10 }, "operational_loss"],
    [{ fixedMonthlyExpensesCents: 220000 }, "break_even"],
    [{}, "tight_margin"],
    [
      {
        fixedMonthlyExpensesCents: 0,
        proLaboreIncluded: false,
        proLaboreCents: 0,
      },
      "adequate_margin",
    ],
  ] as const)(
    "builds scenario-specific content for %s",
    (overrides, verdict) => {
      const snapshot = build({ ...command, ...overrides });
      expect(snapshot.results.verdict).toBe(verdict);
      expect(snapshot.executiveSummary.verdict.label).toBe(
        {
          direct_loss: "Prejuízo por venda",
          operational_loss: "Prejuízo no mês",
          no_sales: "Sem vendas no mês",
          break_even: "No limite",
          tight_margin: "Margem apertada",
          adequate_margin: "Lucro",
        }[verdict],
      );
      expect(snapshot.sections.map(({ key }) => key)).toEqual([
        "break_even",
        "hidden_cost",
        "margin_diagnosis",
        "sales_goal",
        "discount_simulator",
      ]);
      expect(snapshot.sections.map(({ title }) => title)).toEqual([
        "Seu menor preço sem prejuízo",
        "O que sai de cada venda",
        "Quanto sobra no mês",
        "Quanto você precisa vender",
        "Como um desconto muda o resultado",
      ]);
    },
  );

  it("uses Digital cost language and preserves omitted volume", () => {
    const snapshot = build({
      ...command,
      productKind: "digital",
      purchaseUnitCostCents: 0,
      monthlySalesVolume: null,
    });
    const content = JSON.stringify({
      executiveSummary: snapshot.executiveSummary,
      sections: snapshot.sections,
    });
    expect(snapshot.scenario).toBe("digital");
    expect(snapshot.inputs.monthlySalesVolume).toBeNull();
    expect(snapshot.results.monthlySalesVolumeUsed).toBe(0);
    expect(content).toContain("custo por venda");
    expect(content).not.toMatch(/fornecedor|custo de compra|fabricação/i);
    expect(content).not.toMatch(
      /ponto de equilíbrio|pró-labore|alíquota|rateio|receita líquida|margem de contribuição|preço-alvo|custo operacional|meta de 20%|margem ideal/i,
    );
  });

  it("keeps Resale supplier-domain wording separate", () => {
    const content = JSON.stringify(build(command));
    expect(content).toContain("custo de compra");
    expect(content).not.toMatch(/produto digital|fabricação/i);
  });
});
