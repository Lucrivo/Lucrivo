import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";
import { buildDetailedReportContent } from "./build-detailed-report-content";

const command: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 300_000,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 5_500,
      monthlySalesVolume: 200,
      purchaseUnitCostCents: 1_500,
      packagingUnitCostCents: 100,
    },
  ],
};

describe("buildDetailedReportContent", () => {
  it("uses complete item prices and objective positive-result copy", () => {
    const content = buildDetailedReportContent(
      command,
      calculateDetailedDiagnosis(command),
    );
    expect(content.executiveSummary.verdict.label).toBe("Resultado positivo");
    expect(JSON.stringify(content)).toContain(
      "Cada valor inclui o custo direto, a parte dos gastos do mês",
    );
    expect(JSON.stringify(content)).toContain("Quanto sobra a cada R$ 100");
  });

  it("shows one unknown item's monthly quantity without a weekly split", () => {
    const partial = {
      ...command,
      items: [{ ...command.items[0], monthlySalesVolume: null }],
    };
    const content = buildDetailedReportContent(
      partial,
      calculateDetailedDiagnosis(partial),
    );
    const sales = content.sections.find(({ key }) => key === "sales_goal");
    expect(sales?.body).toContain("Como há um único item");
    expect(sales?.body).not.toMatch(/por semana|por dia/);
  });

  it("explains why a multi-item partial quantity is unavailable", () => {
    const partial = {
      ...command,
      items: [
        { ...command.items[0], monthlySalesVolume: 10 },
        {
          ...command.items[0],
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          monthlySalesVolume: null,
        },
      ],
    };
    const content = buildDetailedReportContent(
      partial,
      calculateDetailedDiagnosis(partial),
    );
    expect(JSON.stringify(content)).toContain("inventar uma proporção");
  });
});
