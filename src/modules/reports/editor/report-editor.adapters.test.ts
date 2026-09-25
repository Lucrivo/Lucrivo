import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import { detailedDiagnosisSchema } from "@/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema";
import { composeProductionDiagnosisCommand } from "@/modules/quick-diagnosis/domain/compose-production-diagnosis-command";
import { composeServiceDiagnosisCommand } from "@/modules/quick-diagnosis/domain/compose-service-diagnosis-command";
import { productDiagnosisSchema } from "@/modules/quick-diagnosis/schemas/product-diagnosis.schema";
import { productionDiagnosisSchema } from "@/modules/quick-diagnosis/schemas/production-diagnosis.schema";
import { serviceFlowSubmissionSchema } from "@/modules/quick-diagnosis/schemas/service-flow.schema";

import { buildDetailedReportSnapshot } from "../domain/build-detailed-report-snapshot";
import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "../domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateProductionReport } from "../domain/calculate-production-report";
import { calculateServiceReport } from "../domain/calculate-service-report";
import type { ReportSnapshot } from "../types";
import { toEditableReportDraft } from "./report-editor.adapters";

const submissionId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";

function snapshots(): ReportSnapshot[] {
  const serviceCommand = composeServiceDiagnosisCommand(
    serviceFlowSubmissionSchema.parse({
      submissionId,
      desiredMonthlyIncome: "5000",
      fixedMonthlyExpenses: "1000",
      pricingMethod: "hour",
      currentPrice: "100",
      dailyWorkHours: "8",
      weeklyWorkDays: "5",
      appointmentDurationMinutes: "60",
      hasMaterialCost: false,
      materialCost: "0",
      materialCostUnit: "hour",
      paysRevenueTax: false,
      taxRate: "0",
      hasPaymentFee: false,
      paymentFeeRate: "0",
    }),
  );
  const productCommand = productDiagnosisSchema.parse({
    submissionId,
    productKind: "resale",
    purchaseUnitCost: "12.50",
    unitSalePrice: "30",
    fixedMonthlyExpenses: "800",
    monthlySalesVolume: "0",
    proLaboreIncluded: true,
    proLabore: "1500",
    taxRate: "6",
    cardFeeRate: "3.5",
  });
  const productionCommand = composeProductionDiagnosisCommand(
    productionDiagnosisSchema.parse({
      submissionId,
      costCompositionEnabled: false,
      productionUnitCost: "12.50",
      materialUnitCost: "",
      packagingUnitCost: "",
      directLaborUnitCost: "",
      otherVariableUnitCost: "",
      unitSalePrice: "30",
      fixedMonthlyExpenses: "800",
      monthlySalesVolume: "40",
      proLaboreIncluded: false,
      proLabore: "",
      taxRate: "6",
      cardFeeRate: "3.5",
    }),
  );
  const detailedCommand = detailedDiagnosisSchema.parse({
    submissionId,
    category: "product",
    fixedMonthlyExpenses: "800",
    proLaboreIncluded: false,
    proLabore: "",
    taxRate: "6",
    cardFeeRate: "3.5",
    items: [
      {
        id: itemId,
        kind: "resale",
        name: "Produto A",
        unitSalePrice: "30",
        monthlySalesVolume: "",
        purchaseUnitCost: "12.50",
        packagingUnitCost: "0",
      },
    ],
  });

  return [
    buildServiceReportSnapshot(
      serviceCommand,
      calculateServiceReport(serviceCommand),
    ),
    buildProductReportSnapshot(
      productCommand,
      calculateProductReport(productCommand),
    ),
    buildProductionReportSnapshot(
      productionCommand,
      calculateProductionReport(productionCommand),
    ),
    buildDetailedReportSnapshot(
      detailedCommand,
      calculateDetailedDiagnosis(detailedCommand),
    ),
  ];
}

describe("toEditableReportDraft", () => {
  it("adapts every current snapshot and preserves zero, blanks, and ids", () => {
    const [service, product, production, detailed] = snapshots();

    expect(toEditableReportDraft(service!, () => submissionId)).toMatchObject({
      kind: "service",
      values: { dailyWorkHours: "8", currentPrice: "100" },
    });
    expect(toEditableReportDraft(product!, () => submissionId)).toMatchObject({
      kind: "product",
      values: {
        purchaseUnitCost: "12.5",
        monthlySalesVolume: "0",
        cardFeeRate: "3.5",
      },
    });
    expect(
      toEditableReportDraft(production!, () => submissionId),
    ).toMatchObject({
      kind: "production",
      values: { productionUnitCost: "12.5", monthlySalesVolume: "40" },
    });
    const detailedDraft = toEditableReportDraft(detailed!, () => submissionId);
    expect(detailedDraft).toMatchObject({
      kind: "detailed",
      values: {
        items: [{ id: itemId, monthlySalesVolume: "" }],
      },
    });
    expect(detailedDraft?.values).not.toHaveProperty("promotionMargin");
  });

  it("keeps legacy snapshots readable but not editable", () => {
    const [, product] = snapshots();
    expect(
      toEditableReportDraft(
        { ...product!, contentVersion: 3 } as ReportSnapshot,
        () => submissionId,
      ),
    ).toBeNull();
  });
});

export { snapshots, submissionId };
