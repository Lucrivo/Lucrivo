import { describe, expect, it } from "vitest";

import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { parseProductionReportSnapshot } from "../schemas/production-report-snapshot.schema";
import { buildProductionReportSnapshot } from "./build-production-report-snapshot";
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

function build(input: ProductionDiagnosisCommand) {
  return buildProductionReportSnapshot(input, calculateProductionReport(input));
}

describe("buildProductionReportSnapshot", () => {
  it("builds and parses the Production 3/3/4 contract", () => {
    const snapshot = build(command);
    expect(snapshot).toEqual(
      expect.objectContaining({
        schemaVersion: 3,
        calculationVersion: 3,
        contentVersion: 4,
        scenario: "manufacturing",
      }),
    );
    expect(snapshot.results).toEqual(
      expect.objectContaining({
        monthlySalesVolumeUsed: 100,
        monthlyResultCents: 120000,
        totalFeeBasisPoints: 800,
      }),
    );
    expect(snapshot.results).not.toHaveProperty("targetPriceCents");
    expect(parseProductionReportSnapshot(snapshot)).toEqual(snapshot);
  });

  it.each([
    [{ unitSalePriceCents: 5000, monthlySalesVolume: null }, "direct_loss"],
    [{ monthlySalesVolume: null }, "incomplete_volume"],
    [
      {
        monthlySalesVolume: null,
        fixedMonthlyExpensesCents: 0,
        proLaboreIncluded: false,
        proLaboreCents: 0,
      },
      "incomplete_volume",
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
  ] as const)("builds manufacturing content for %s", (overrides, verdict) => {
    const snapshot = build({ ...command, ...overrides });
    expect(snapshot.results.verdict).toBe(verdict);
    expect(snapshot.sections.map(({ title }) => title)).toEqual([
      "Seu menor preço sem prejuízo",
      "O que sai de cada venda",
      "Quanto sobra no mês",
      "Quanto você precisa vender",
      "Como um desconto muda o resultado",
    ]);
    const content = JSON.stringify({
      executiveSummary: snapshot.executiveSummary,
      sections: snapshot.sections,
    });
    expect(content).toContain("custo de fabricação");
    expect(content).toContain("unidades vendidas");
    expect(content).not.toMatch(
      /custo de compra|fornecedor|produto digital|unidades produzidas por mês/i,
    );
    if (
      "monthlySalesVolume" in overrides &&
      overrides.monthlySalesVolume === null &&
      verdict !== "direct_loss"
    ) {
      expect(
        snapshot.sections.find(({ key }) => key === "margin_diagnosis"),
      ).toMatchObject({
        emphasisLabel: "Resultado mensal",
        emphasisValue: "Ainda não calculado",
        tone: "neutral",
      });
      const salesGoal = snapshot.sections.find(
        ({ key }) => key === "sales_goal",
      );
      expect(salesGoal?.body).toContain("esta meta é apenas uma referência");
      expect(salesGoal?.body).not.toMatch(/por semana|por dia/);
    }
    expect(content).not.toMatch(
      /ponto de equilíbrio|pró-labore|alíquota|rateio|receita líquida|margem de contribuição|preço-alvo|custo operacional|meta de 20%|margem ideal/i,
    );
  });

  it("describes composed manufacturing cost in plain language", () => {
    const content = JSON.stringify(build(command).sections[1]);
    expect(content).toMatch(
      /materiais|embalagem|seu trabalho por unidade|outros gastos por unidade/,
    );
    expect(content).not.toMatch(/mão de obra direta|pró-labore/i);
  });

  it("accepts the summarized current contract", () => {
    const summarized = build({
      ...command,
      costCompositionEnabled: false,
      materialUnitCostCents: null,
      packagingUnitCostCents: null,
      directLaborUnitCostCents: null,
      otherVariableUnitCostCents: null,
    });
    expect(parseProductionReportSnapshot(summarized)).toEqual(summarized);
  });
});
