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
    pricingMethod: "week",
    currentPriceCents: 450_000,
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
  submissionId: "54000000-0000-4000-8000-000000000001",
  category: "production",
  fixedMonthlyExpensesCents: 100_000,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  items: [
    {
      id: "54100000-0000-4000-8000-000000000001",
      position: 0,
      name: "Bolo de cenoura",
      kind: "manufacturing",
      costMode: "technical_sheet",
      unitSalePriceCents: 5_000,
      monthlySalesVolume: 50,
      recipeYield: 10,
      lossRateBasisPoints: 500,
      packagingUnitCostCents: 100,
      directLaborUnitCostCents: 200,
      otherVariableUnitCostCents: 50,
      ingredients: [
        {
          id: "54200000-0000-4000-8000-000000000001",
          position: 0,
          name: "Farinha",
          quantityMillionths: 1_500_000,
          unit: "kg",
          unitCostTenThousandths: 30_000,
        },
      ],
    },
  ],
};

describe("report RPC argument mappers", () => {
  it("maps Service source data without accepting a user id", () => {
    const snapshot = buildServiceReportSnapshot(
      serviceCommand,
      calculateServiceReport(serviceCommand),
    );
    const args = toServiceRpcArgs(serviceCommand, snapshot);

    expect(args).toMatchObject({
      p_submission_id: serviceCommand.submissionId,
      p_source_pricing_method: "week",
      p_source_current_price_cents: 450_000,
      p_schema_version: snapshot.schemaVersion,
      p_verdict: snapshot.results.verdict,
    });
    expect(args).not.toHaveProperty("p_user_id");
  });

  it("preserves nullable Product values", () => {
    const snapshot = buildProductReportSnapshot(
      productCommand,
      calculateProductReport(productCommand),
    );

    expect(toProductRpcArgs(productCommand, snapshot)).toMatchObject({
      p_submission_id: productCommand.submissionId,
      p_monthly_sales_volume: null,
      p_monthly_result_cents: null,
      p_real_margin_basis_points: null,
      p_verdict: "incomplete_volume",
    });
  });

  it("maps composed Production costs", () => {
    const snapshot = buildProductionReportSnapshot(
      productionCommand,
      calculateProductionReport(productionCommand),
    );

    expect(toProductionRpcArgs(productionCommand, snapshot)).toMatchObject({
      p_submission_id: productionCommand.submissionId,
      p_cost_composition_enabled: true,
      p_material_unit_cost_cents: 3_000,
      p_production_unit_cost_cents: 5_000,
      p_verdict: snapshot.results.verdict,
    });
  });

  it("combines detailed source items with calculated fields", () => {
    const calculation = calculateDetailedDiagnosis(detailedCommand);
    const snapshot = buildDetailedReportSnapshot(detailedCommand, calculation);
    const args = toDetailedRpcArgs(detailedCommand, snapshot);
    const sourceItem = detailedCommand.items[0];
    if (
      !sourceItem ||
      sourceItem.kind !== "manufacturing" ||
      sourceItem.costMode !== "technical_sheet"
    ) {
      throw new Error("Expected a technical-sheet manufacturing item.");
    }

    expect(args).toMatchObject({
      p_submission_id: detailedCommand.submissionId,
      p_category: "production",
      p_item_count: 1,
      p_is_partial: false,
      p_verdict: calculation.verdict,
    });
    expect(args.p_items).toEqual([
      expect.objectContaining({
        id: sourceItem.id,
        variableUnitCostCents: calculation.items[0]?.variableUnitCostCents,
        ingredients: sourceItem.ingredients,
      }),
    ]);
  });
});
