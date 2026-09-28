import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";
import type {
  NormalizedServiceDiagnosisCommand,
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";

import { buildDetailedReportSnapshot } from "../domain/build-detailed-report-snapshot";
import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "../domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateProductionReport } from "../domain/calculate-production-report";
import { calculateServiceReport } from "../domain/calculate-service-report";
import {
  toDetailedRpcArgs,
  toProductRpcArgs,
  toProductionRpcArgs,
  toServiceRpcArgs,
} from "./report-rpc-args";

const serviceCommand: NormalizedServiceDiagnosisCommand = {
  submissionId: "51000000-0000-4000-8000-000000000001",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7_794,
  weeklyWorkDays: 5,
  hourlyRateCents: 15_000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 1_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "hour",
    currentPriceCents: 15_000,
    materialCostUnit: "hour",
    materialCostCents: 1_000,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 60,
  },
};

const productCommand: ProductDiagnosisCommand = {
  submissionId: "52000000-0000-4000-8000-000000000001",
  productKind: "resale",
  purchaseUnitCostCents: 5_000,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: null,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const productionCommand: ProductionDiagnosisCommand = {
  submissionId: "53000000-0000-4000-8000-000000000001",
  costCompositionEnabled: false,
  productionUnitCostCents: 5_000,
  materialUnitCostCents: null,
  packagingUnitCostCents: null,
  directLaborUnitCostCents: null,
  otherVariableUnitCostCents: null,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const detailedCommand: DetailedDiagnosisCommand = {
  submissionId: "54000000-0000-4000-8000-000000000001",
  category: "product",
  fixedMonthlyExpensesCents: 100_000,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  items: [
    {
      id: "54100000-0000-4000-8000-000000000001",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 10_000,
      monthlySalesVolume: 100,
      purchaseUnitCostCents: 5_000,
      packagingUnitCostCents: 0,
    },
  ],
};

function allArgs() {
  const serviceSnapshot = buildServiceReportSnapshot(
    serviceCommand,
    calculateServiceReport(serviceCommand),
  );
  const productSnapshot = buildProductReportSnapshot(
    productCommand,
    calculateProductReport(productCommand),
  );
  const productionSnapshot = buildProductionReportSnapshot(
    productionCommand,
    calculateProductionReport(productionCommand),
  );
  const detailedCalculation = calculateDetailedDiagnosis(detailedCommand);
  const detailedSnapshot = buildDetailedReportSnapshot(
    detailedCommand,
    detailedCalculation,
  );
  return {
    service: toServiceRpcArgs(serviceCommand, serviceSnapshot),
    product: toProductRpcArgs(productCommand, productSnapshot),
    production: toProductionRpcArgs(productionCommand, productionSnapshot),
    detailed: toDetailedRpcArgs(detailedCommand, detailedSnapshot),
    detailedCalculation,
  };
}

describe("report RPC argument mappers", () => {
  it("preserves the current quick-report version tuples", () => {
    const args = allArgs();
    expect(args.service).toMatchObject({
      p_schema_version: 4,
      p_calculation_version: 3,
      p_content_version: 5,
    });
    expect(args.product).toMatchObject({
      p_schema_version: 3,
      p_calculation_version: 3,
      p_content_version: 4,
    });
    expect(args.production).toMatchObject({
      p_schema_version: 3,
      p_calculation_version: 3,
      p_content_version: 4,
    });
  });

  it("preserves nullable Product values", () => {
    expect(allArgs().product).toMatchObject({
      p_monthly_sales_volume: null,
      p_monthly_result_cents: null,
      p_real_margin_basis_points: null,
      p_verdict: "incomplete_volume",
    });
  });

  it("persists all four detailed full-cost fields in p_items", () => {
    const { detailed, detailedCalculation } = allArgs();
    expect(detailed.p_items).toEqual([
      expect.objectContaining({
        fixedAllocationCents:
          detailedCalculation.items[0]?.fixedAllocationCents,
        totalUnitCostCents: detailedCalculation.items[0]?.totalUnitCostCents,
        unitProfitCents: detailedCalculation.items[0]?.unitProfitCents,
        realMarginBasisPoints:
          detailedCalculation.items[0]?.realMarginBasisPoints,
      }),
    ]);
  });

  it("does not serialize target or attention fields in any RPC argument", () => {
    const { detailedCalculation: _calculation, ...args } = allArgs();
    expect(JSON.stringify(args)).not.toMatch(
      /targetMarginBasisPoints|attentionBandBasisPoints|targetPriceCents|priceReferencesPartial/,
    );
  });
});
