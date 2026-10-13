import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type {
  DetailedDiagnosisCommand,
  DetailedProductItem,
} from "@/modules/detailed-diagnosis/types";

import { buildDetailedReportSnapshot } from "../domain/build-detailed-report-snapshot";
import { toDetailedReportViewModel } from "./to-detailed-report-view-model";

const baseCommand: DetailedDiagnosisCommand & {
  items: DetailedProductItem[];
} = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 10_000,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 0,
  cardFeeRateBasisPoints: 0,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 5_000,
      monthlySalesVolume: 20,
      purchaseUnitCostCents: 2_000,
      packagingUnitCostCents: 200,
    },
  ],
};

function present(command: DetailedDiagnosisCommand = baseCommand) {
  const calculation = calculateDetailedDiagnosis(command);
  return toDetailedReportViewModel({
    id: 168,
    createdAt: "2026-09-17T15:00:00.000Z",
    snapshot: buildDetailedReportSnapshot(command, calculation),
  });
}

describe("toDetailedReportViewModel", () => {
  it("shows full unit economics separately from the value left for the month", () => {
    const model = present();

    expect(model.executiveSummary.verdict.toneLabel).toBe("Resultado positivo");
    expect(model.items[0]).toMatchObject({
      priceLabel: "R$ 50,00",
      netRevenueLabel: "R$ 50,00",
      variableCostLabel: "R$ 22,00",
      fixedAllocationLabel: "R$ 5,00",
      totalUnitCostLabel: "R$ 27,00",
      unitProfitLabel: "R$ 23,00",
      realMarginLabel: "46%",
      statusLabel: "Cobre o mês",
      statusTone: "positive",
      headlineLabel: "Resultado por venda",
      headlineValue: "R$ 23,00",
      headlineValueTone: "positive",
      unitProfitTone: "positive",
      realMarginTone: "positive",
      unitContributionTone: "neutral",
      allocationNote:
        "Os gastos do mês foram divididos igualmente entre as 20 unidades informadas.",
      unitContributionLabel: "R$ 28,00",
      monthlyContributionLabel: "R$ 560,00",
      monthlyContributionContext:
        "20 vendas × R$ 28,00. Este total ainda será comparado com os gastos do mês.",
      breakEvenLabel: "R$ 27,00",
      discountSimulationBase: {
        originalPriceCents: 5_000,
        unitCostCents: 2_700,
        totalFeeBasisPoints: 0,
        minimumPriceCents: 2_700,
      },
    });
    expect(model.comparison[0]).toMatchObject({
      amountCents: 46_000,
      amountLabel: "R$ 460,00",
      contextLabel: "no mês",
      statusLabel: "Resultado estimado do item",
    });
    expect(model.minimumPriceSection).toMatchObject({
      title: "Menores preços para não ficar no prejuízo",
      details: [
        {
          id: baseCommand.items[0]!.id,
          label: "Caneca",
          value: "R$ 27,00",
        },
      ],
    });
  });

  it("explains a complete mix goal with separate current and required rhythms", () => {
    const model = present({
      ...baseCommand,
      items: [
        baseCommand.items[0]!,
        {
          ...baseCommand.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Copo",
        },
      ],
    });
    const sales = model.indicators.find(({ key }) => key === "sales");

    expect(sales).toMatchObject({
      value: "4 unidades",
      supportingText:
        "Quantidade total necessária para que as vendas cubram os gastos do mês, mantendo a proporção informada entre os itens.",
      details: [
        {
          id: "reported-volume",
          label: "Quantidade informada",
          value: "40 unidades no mês",
        },
        {
          id: "required-pace",
          label: "Ritmo médio necessário",
          value: "1 por semana ou 1 por dia",
        },
      ],
    });
    expect(model.minimumPriceSection?.details).toEqual([
      {
        id: baseCommand.items[0]!.id,
        label: "Caneca",
        value: "R$ 24,50",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        label: "Copo",
        value: "R$ 24,50",
      },
    ]);
  });

  it("explains break-even and revenue without repeating margin help", () => {
    const model = present();
    const byKey = new Map(
      model.indicators.map((indicator) => [indicator.key, indicator]),
    );

    expect(byKey.get("break_even")).toMatchObject({
      supportingText:
        "É quanto precisa entrar em vendas no mês para pagar os custos dos itens e os gastos mensais considerados.",
      description: expect.stringMatching(/Você fatura/),
    });
    expect(byKey.get("revenue")).toMatchObject({
      supportingText:
        "É o faturamento estimado usando os preços e as quantidades informadas.",
      description: "Custos do mês: R$ 540,00.",
    });
    expect(byKey.get("margin")?.description).toBeUndefined();
  });

  it("uses the break-even reference when the item volume is unknown", () => {
    const model = present({
      ...baseCommand,
      items: [{ ...baseCommand.items[0]!, monthlySalesVolume: null }],
    });

    expect(model.items[0]).toMatchObject({
      statusLabel: "Deixa valor por venda",
      statusTone: "neutral",
      headlineLabel: "Valor deixado por venda",
      headlineValue: "R$ 28,00",
      headlineValueTone: "neutral",
      unitProfitTone: "neutral",
      unitContributionTone: "neutral",
      unitProfitLabel: "R$ 0,00 no equilíbrio",
      realMarginLabel: "0% no equilíbrio",
      allocationNote:
        "Referência se este item fosse vendido sozinho, nas 4 unidades de equilíbrio.",
      breakEvenReferenceLabel:
        "Para não ter prejuízo vendendo só este item: 4 unidades por mês.",
    });
    expect(model.items[0]?.monthlyContributionContext).toBeUndefined();
    expect(model.items[0]?.coverageNote).toBeUndefined();
    expect(model.items[0]?.fixedAllocationLabel).not.toBe(
      "Ainda não calculado",
    );
    expect(model.items[0]?.totalUnitCostLabel).not.toBe("Ainda não calculado");
    expect(model.items[0]?.breakEvenLabel).not.toBe("Ainda não calculado");
    expect(model.items[0]?.discountSimulationBase.unitCostCents).not.toBeNull();
    expect(model.comparison[0]).toMatchObject({
      amountCents: 2_800,
      contextLabel: "por unidade",
      statusLabel: "Ajuda a pagar os gastos do mês",
    });
  });

  it("shows the allocated loss when the sale leaves money but misses the month", () => {
    const model = present({
      ...baseCommand,
      fixedMonthlyExpensesCents: 1_000_000,
      taxRateBasisPoints: 800,
      items: [
        {
          ...baseCommand.items[0]!,
          unitSalePriceCents: 10_000,
          monthlySalesVolume: 10,
          purchaseUnitCostCents: 5_000,
          packagingUnitCostCents: 0,
        },
      ],
    });

    expect(model.items[0]).toMatchObject({
      statusLabel: "Não cobre o mês",
      statusTone: "warning",
      headlineLabel: "Resultado por venda",
      headlineValue: "-R$ 958,00",
      headlineValueTone: "critical",
      unitProfitTone: "critical",
      realMarginTone: "critical",
      unitContributionTone: "neutral",
      coverageNote:
        "Cada venda deixa R$ 42,00. A parte dos gastos do mês desta unidade é R$ 1.000,00, então o resultado é -R$ 958,00.",
      monthlyContributionContext:
        "10 vendas × R$ 42,00. Este total ainda será comparado com os gastos do mês.",
    });
  });

  it("keeps an exact month payment distinct from a surplus", () => {
    const model = present({
      ...baseCommand,
      items: [
        {
          ...baseCommand.items[0]!,
          unitSalePriceCents: 2_700,
        },
      ],
    });

    expect(model.items[0]).toMatchObject({
      statusLabel: "Paga o mês, sem sobra",
      statusTone: "neutral",
      headlineLabel: "Resultado por venda",
      headlineValue: "R$ 0,00",
    });
  });

  it("keeps a direct loss on the value left by the sale", () => {
    const model = present({
      ...baseCommand,
      items: [
        {
          ...baseCommand.items[0]!,
          unitSalePriceCents: 1_000,
        },
      ],
    });

    expect(model.items[0]).toMatchObject({
      statusLabel: "Perda por venda",
      statusTone: "critical",
      headlineLabel: "Valor deixado por venda",
      headlineValue: "-R$ 12,00",
      headlineValueTone: "critical",
      unitContributionTone: "critical",
    });
    expect(model.items[0]?.coverageNote).toBeUndefined();
  });

  it("shows a single-item unknown-volume goal with the break-even reference", () => {
    const model = present({
      ...baseCommand,
      items: [{ ...baseCommand.items[0]!, monthlySalesVolume: null }],
    });
    const sales = model.indicators.find(({ key }) => key === "sales");

    expect(sales).toMatchObject({
      key: "sales",
      label: "Unidades necessárias no mês",
      value: "4 unidades",
      featured: true,
    });
    expect(sales?.supportingText).toMatch(/Referência de equilíbrio/);
    expect(sales?.supportingText).toMatch(/por semana/);
    expect(sales?.details).toBeUndefined();
  });

  it("shows every isolated reference without inventing one mix goal", () => {
    const model = present({
      ...baseCommand,
      items: [
        { ...baseCommand.items[0]!, monthlySalesVolume: null },
        {
          ...baseCommand.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Copo",
          monthlySalesVolume: null,
        },
      ],
    });
    const sales = model.indicators.find(({ key }) => key === "sales");

    expect(sales).toMatchObject({
      value: "Sem meta única",
      unavailable: true,
      supportingText:
        "Faltam quantidades para definir a proporção do conjunto.",
      details: [
        {
          id: baseCommand.items[0]!.id,
          label: "Caneca",
          value: "4 unidades se vendido sozinho",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          label: "Copo",
          value: "4 unidades se vendido sozinho",
        },
      ],
    });
    expect(model.items.every((item) => item.breakEvenReferenceLabel)).toBe(
      true,
    );
    expect(model.minimumPriceSection?.details).toMatchObject([
      {
        id: baseCommand.items[0]!.id,
        label: "Caneca",
        supportingText: "Referência considerando este item vendido sozinho.",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        label: "Copo",
        supportingText: "Referência considerando este item vendido sozinho.",
      },
    ]);
  });

  it("uses a specific explanation for each unavailable consolidated value", () => {
    const model = present({
      ...baseCommand,
      items: [
        { ...baseCommand.items[0]!, monthlySalesVolume: null },
        {
          ...baseCommand.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Copo",
          monthlySalesVolume: 10,
        },
      ],
    });
    const byKey = new Map(
      model.indicators.map((indicator) => [indicator.key, indicator]),
    );

    expect(byKey.get("break_even")?.supportingText).toBe(
      "O faturamento de equilíbrio do conjunto depende da proporção entre os itens.",
    );
    expect(byKey.get("margin")?.supportingText).toBe(
      "Informe todas as quantidades para calcular quanto sobra no conjunto.",
    );
    expect(byKey.get("revenue")?.supportingText).toBe(
      "Informe todas as quantidades para somar quanto entra no mês.",
    );
    expect(byKey.get("break_even")?.description).toBe(
      "É quanto precisa entrar em vendas no mês para pagar os custos dos itens e os gastos mensais considerados.",
    );
    expect(byKey.get("revenue")?.description).toBe(
      "É o faturamento estimado usando os preços e as quantidades informadas.",
    );
    expect(byKey.get("margin")?.description).toBeUndefined();
  });

  it("keeps the persisted narrative on older detailed content versions", () => {
    const command = {
      ...baseCommand,
      items: [{ ...baseCommand.items[0]!, monthlySalesVolume: null }],
    };
    const snapshot = buildDetailedReportSnapshot(
      command,
      calculateDetailedDiagnosis(command),
    );
    const historical = toDetailedReportViewModel({
      id: 169,
      createdAt: "2026-09-17T15:00:00.000Z",
      snapshot: { ...snapshot, contentVersion: 2 },
    });

    expect(historical.items[0]?.breakEvenReferenceLabel).toBeUndefined();
    expect(historical.items[0]?.fixedAllocationLabel).toBe(
      "Ainda não calculado",
    );
    expect(historical.sections.map(({ key }) => key)).toEqual([
      "break_even",
      "margin_diagnosis",
      "sales_goal",
    ]);
    expect(
      historical.indicators.every(
        ({ description }) => description === undefined,
      ),
    ).toBe(true);
    expect(historical.minimumPriceSection).toBeNull();
  });

  it("uses help descriptions that explain the value in everyday language", () => {
    const model = present();
    const descriptions = model.indicators
      .flatMap(({ help }) => (help ? [help.description] : []))
      .join(" ");

    expect(descriptions).not.toMatch(/rateio|contribuição/i);
    expect(descriptions).toMatch(/pagar os gastos|pagar tudo|ficam com você/i);
  });
});
