import { describe, expect, it } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";
import { parseProductReportSnapshot } from "../schemas/product-report-snapshot.schema";
import { buildProductReportSnapshot } from "./build-product-report-snapshot";
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

function build(input: ProductDiagnosisCommand) {
  return buildProductReportSnapshot(input, calculateProductReport(input));
}

describe("buildProductReportSnapshot", () => {
  it("builds the Product 3/3/6 contract with direct summary language", () => {
    const snapshot = build(command);
    const content = JSON.stringify(snapshot);

    expect(snapshot).toMatchObject({
      schemaVersion: 3,
      calculationVersion: 3,
      contentVersion: 6,
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
    expect(content).toContain("Parte dos gastos do mês");
    expect(content).toContain("Custo completo por unidade");
    expect(content).toContain("Valor deixado por venda");
    expect(content).toContain("Resultado por venda");
    expect(content).toContain("Quanto sobra a cada R$ 100");
    expect(
      snapshot.sections.find(({ key }) => key === "margin_diagnosis"),
    ).toMatchObject({
      title: "Quanto sobra no mês",
      body: expect.stringContaining("recebidos depois de impostos e cartão"),
      emphasisLabel: "Lucro no mês",
      emphasisValue: "R$ 3.030,00",
    });
    expect(
      snapshot.sections.find(({ key }) => key === "sales_goal"),
    ).toMatchObject({
      title: "Quanto você precisa vender",
      emphasisLabel: "Faturamento necessário no mês",
      emphasisValue: "R$ 6.258,90",
    });
    expect(parseProductReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it("adapts the monthly mini-card to loss and break-even scenarios", () => {
    const loss = build({ ...command, monthlySalesVolume: 10 });
    expect(
      loss.sections.find(({ key }) => key === "margin_diagnosis"),
    ).toMatchObject({
      title: "Quanto sobra no mês",
      emphasisLabel: "Prejuízo no mês",
      emphasisValue: "-R$ 3.648,50",
    });

    const breakEven = build({
      ...command,
      fixedMonthlyExpensesCents: 351_500,
      monthlySalesVolume: 100,
      proLaboreIncluded: false,
      proLaboreCents: 0,
    });
    expect(
      breakEven.sections.find(({ key }) => key === "margin_diagnosis"),
    ).toMatchObject({
      emphasisLabel: "Sem lucro nem prejuízo",
      emphasisValue: "R$ 0,00",
    });
  });

  it("describes the break-even reference when volume is unknown", () => {
    const snapshot = build({ ...command, monthlySalesVolume: null });
    const content = JSON.stringify(snapshot);

    expect(snapshot.results).toMatchObject({
      minimumPriceCents: null,
      totalUnitCostCents: null,
      unitProfitCents: null,
      realMarginBasisPoints: null,
      monthlySalesGoal: 114,
    });
    expect(snapshot.discountSimulationBase).toMatchObject({
      unitCostCents: null,
      minimumPriceCents: null,
    });
    expect(content).toContain("ponto de equilíbrio");
    expect(content).toMatch(/114 vendas/);
    expect(content).toMatch(/por semana/);
    expect(
      snapshot.sections.find(({ key }) => key === "margin_diagnosis"),
    ).toMatchObject({
      title: "Quanto sobra no mês",
      emphasisValue: "R$ 0,00",
      tone: "neutral",
    });
    expect(snapshot.executiveSummary.verdict.label).toBe(
      "Equilíbrio como referência",
    );
  });

  it("omits the withdrawal clause when pro-labore is disabled", () => {
    const content = JSON.stringify(
      build({
        ...command,
        monthlySalesVolume: null,
        proLaboreIncluded: false,
        proLaboreCents: 999_999,
      }),
    );
    expect(content).not.toContain("e o valor informado para você");
  });

  it("contains no target-based or margin-quality language", () => {
    expect(JSON.stringify(build(command))).not.toMatch(
      /margem adequada|margem apertada|acima da meta|boa folga|pouca folga|meta de 15%|meta de 20%|preço-alvo/i,
    );
  });
});
