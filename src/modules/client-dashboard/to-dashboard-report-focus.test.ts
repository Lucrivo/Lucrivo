import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";
import type {
  NormalizedServiceDiagnosisCommand,
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";
import { buildDetailedReportSnapshot } from "@/modules/reports/domain/build-detailed-report-snapshot";
import { buildProductReportSnapshot } from "@/modules/reports/domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "@/modules/reports/domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "@/modules/reports/domain/build-service-report-snapshot";
import { calculateProductReport } from "@/modules/reports/domain/calculate-product-report";
import { calculateProductionReport } from "@/modules/reports/domain/calculate-production-report";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";
import { toDetailedReportViewModel } from "@/modules/reports/presenters/to-detailed-report-view-model";
import type { OwnedReport } from "@/modules/reports/services/get-report.service";
import type { ReportSnapshot } from "@/modules/reports/types";

import { toDashboardReportFocus } from "./to-dashboard-report-focus";

const serviceCommand: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7_794,
  weeklyWorkDays: 5,
  hourlyRateCents: 8_000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "hour",
    currentPriceCents: 8_000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};

const productCommand: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  productKind: "resale",
  purchaseUnitCostCents: 5_000,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const productionCommand: ProductionDiagnosisCommand = {
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  costCompositionEnabled: true,
  productionUnitCostCents: 5_000,
  materialUnitCostCents: 3_000,
  packagingUnitCostCents: 500,
  directLaborUnitCostCents: 1_000,
  otherVariableUnitCostCents: 500,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const detailedCommand: DetailedDiagnosisCommand = {
  submissionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
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
      name: "Item com perda",
      kind: "resale",
      unitSalePriceCents: 1_500,
      monthlySalesVolume: 10,
      purchaseUnitCostCents: 2_000,
      packagingUnitCostCents: 100,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      position: 1,
      name: "Item sem volume",
      kind: "resale",
      unitSalePriceCents: 5_000,
      monthlySalesVolume: null,
      purchaseUnitCostCents: 2_000,
      packagingUnitCostCents: 200,
    },
  ],
};

function ownedReport(
  id: number,
  snapshot: ReportSnapshot,
  updatedAt = "2026-09-30T18:30:00.000Z",
): OwnedReport {
  return {
    id,
    createdAt: "2026-09-30T18:30:00.000Z",
    updatedAt,
    version: 0,
    snapshot,
  };
}

function serviceReport(): OwnedReport {
  return ownedReport(
    42,
    buildServiceReportSnapshot(
      serviceCommand,
      calculateServiceReport(serviceCommand),
    ),
  );
}

function productReport(
  command: ProductDiagnosisCommand = productCommand,
): OwnedReport {
  return ownedReport(
    43,
    buildProductReportSnapshot(command, calculateProductReport(command)),
  );
}

function productionReport(): OwnedReport {
  return ownedReport(
    44,
    buildProductionReportSnapshot(
      productionCommand,
      calculateProductionReport(productionCommand),
    ),
  );
}

function detailedReport(
  command: DetailedDiagnosisCommand = detailedCommand,
): OwnedReport {
  return ownedReport(
    45,
    buildDetailedReportSnapshot(command, calculateDetailedDiagnosis(command)),
    "2026-10-01T12:00:00.000Z",
  );
}

describe("toDashboardReportFocus quick reports", () => {
  it("selects the same semantic metrics for every quick category", () => {
    for (const report of [
      serviceReport(),
      productReport(),
      productionReport(),
    ]) {
      expect(
        toDashboardReportFocus(report).metrics.map((item) => item.key),
      ).toEqual(["profit", "margin", "minimum", "sales"]);
    }

    expect(toDashboardReportFocus(productReport())).toMatchObject({
      categoryLabel: "Produto",
      modeLabel: "Rápido",
    });
    expect(toDashboardReportFocus(productionReport())).toMatchObject({
      categoryLabel: "Produção",
      modeLabel: "Rápido",
    });
  });

  it("describes one analyzed service and preserves the direct report link", () => {
    expect(toDashboardReportFocus(serviceReport())).toMatchObject({
      modeLabel: "Rápido",
      complementaryFacts: expect.arrayContaining([
        {
          key: "analyzed_items",
          label: "Ofertas analisadas",
          value: "1 serviço analisado",
        },
      ]),
      openHref: "/reports/42",
    });
  });

  it("preserves unavailable Product values instead of inventing zero", () => {
    const focus = toDashboardReportFocus(
      productReport({ ...productCommand, monthlySalesVolume: null }),
    );
    const selected = focus.metrics.filter(({ key }) =>
      ["profit", "margin", "minimum"].includes(key),
    );

    expect(selected.map(({ value }) => value)).toEqual([
      "Ainda não calculado",
      "Ainda não calculado",
      "Ainda não calculado",
    ]);
    expect(JSON.stringify(selected)).not.toContain("R$ 0,00");
  });

  it("shows the calculated discount limit with its mandatory warning", () => {
    const snapshot = productReport().snapshot;
    if ("analysisMode" in snapshot) throw new Error("expected quick snapshot");

    expect(
      toDashboardReportFocus(productReport()).complementaryFacts,
    ).toContainEqual({
      key: "discount_limit",
      label: "Limite antes do prejuízo",
      value: `${snapshot.results.breakEvenDiscountPercent}%`,
      supportingText:
        "É um limite calculado, não uma recomendação de desconto.",
    });
  });
});

describe("toDashboardReportFocus detailed reports", () => {
  it("selects existing metrics and reads complementary counts from the snapshot", () => {
    const focus = toDashboardReportFocus(detailedReport());

    expect(focus.metrics.map((item) => item.key)).toEqual([
      "result",
      "margin",
      "break_even",
      "sales",
    ]);
    expect(focus.complementaryFacts).toEqual(
      expect.arrayContaining([
        {
          key: "direct_loss_items",
          label: "Itens com perda por venda",
          value: "1",
        },
        {
          key: "missing_volume_items",
          label: "Itens sem volume informado",
          value: "1",
        },
        { key: "analyzed_items", label: "Itens analisados", value: "2" },
      ]),
    );
    expect(focus.updatedAtLabel).not.toBeNull();
  });

  it("reuses the detailed sales-goal current-mix limitation unchanged", () => {
    const command: DetailedDiagnosisCommand = {
      ...detailedCommand,
      items: detailedCommand.items.map((item, index) => ({
        ...item,
        monthlySalesVolume: index === 0 ? 10 : 5,
      })),
    };
    const report = detailedReport(command);
    const snapshot = report.snapshot;
    if (!("analysisMode" in snapshot)) throw new Error("expected detailed");

    const existing = toDetailedReportViewModel({
      id: report.id,
      createdAt: report.createdAt,
      snapshot,
    }).numbers.find(({ key }) => key === "sales");
    const focused = toDashboardReportFocus(report).metrics.find(
      ({ key }) => key === "sales",
    );

    expect(existing?.supportingText).toContain(
      "mantendo a proporção informada entre os itens",
    );
    expect(focused?.supportingText).toBe(existing?.supportingText);
  });
});
