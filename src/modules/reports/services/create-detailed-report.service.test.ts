import { beforeEach, describe, expect, it, vi } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";

vi.mock("server-only", () => ({}));

import { buildDetailedReportSnapshot } from "../domain/build-detailed-report-snapshot";
import { createDetailedReport } from "./create-detailed-report.service";

const productCommand: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 10000,
  proLaboreIncluded: true,
  proLaboreCents: 20000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  promotionMarginBasisPoints: 1500,
  items: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      position: 1,
      name: "Caderno",
      kind: "resale",
      unitSalePriceCents: 2000,
      monthlySalesVolume: 20,
      purchaseUnitCostCents: 800,
      packagingUnitCostCents: 100,
    },
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 1000,
      monthlySalesVolume: 10,
      purchaseUnitCostCents: 400,
      packagingUnitCostCents: 50,
    },
  ],
};

const productionCommand: DetailedDiagnosisCommand = {
  ...productCommand,
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  category: "production",
  items: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      position: 0,
      name: "Bolo",
      kind: "manufacturing",
      costMode: "technical_sheet",
      unitSalePriceCents: 5000,
      monthlySalesVolume: 5,
      recipeYield: 10,
      lossRateBasisPoints: 1000,
      packagingUnitCostCents: 100,
      directLaborUnitCostCents: 200,
      otherVariableUnitCostCents: 50,
      ingredients: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          position: 0,
          name: "Farinha",
          quantityMillionths: 1500000,
          unit: "kg",
          unitCostTenThousandths: 30000,
        },
      ],
    },
  ],
};

describe("createDetailedReport", () => {
  const rpc = vi.fn();
  const supabase = { rpc };

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: 42, error: null });
  });

  async function create(command: DetailedDiagnosisCommand) {
    const calculation = calculateDetailedDiagnosis(command);
    const snapshot = buildDetailedReportSnapshot(command, calculation);

    return {
      calculation,
      snapshot,
      result: await createDetailedReport({
        supabase: supabase as never,
        command,
        snapshot,
      }),
    };
  }

  it("maps ordered normalized Product items with authoritative results", async () => {
    const { calculation, result, snapshot } = await create(productCommand);

    expect(result).toEqual({ status: "success", diagnosisId: 42 });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("create_detailed_diagnosis_report", {
      p_submission_id: productCommand.submissionId,
      p_category: "product",
      p_fixed_monthly_expenses_cents: 10000,
      p_pro_labore_included: true,
      p_pro_labore_cents: 20000,
      p_tax_rate_basis_points: 600,
      p_card_fee_rate_basis_points: 200,
      p_promotion_margin_basis_points: 1500,
      p_items: [
        {
          ...productCommand.items[1],
          ...calculation.items.find(
            (item) => item.itemId === productCommand.items[1].id,
          ),
          itemId: undefined,
        },
        {
          ...productCommand.items[0],
          ...calculation.items.find(
            (item) => item.itemId === productCommand.items[0].id,
          ),
          itemId: undefined,
        },
      ].map(({ itemId, ...item }) => {
        void itemId;
        return item;
      }),
      p_schema_version: 1,
      p_calculation_version: 1,
      p_content_version: 1,
      p_monthly_gross_revenue_cents: snapshot.results.monthlyGrossRevenueCents,
      p_monthly_result_cents: snapshot.results.monthlyResultCents,
      p_real_margin_basis_points: snapshot.results.finalMarginBasisPoints,
      p_verdict: snapshot.results.verdict,
      p_priority: snapshot.results.priority,
      p_item_count: 2,
      p_is_partial: false,
      p_report_snapshot: snapshot,
    });
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("user_id");
  });

  it("preserves normalized technical-sheet ingredients", async () => {
    const { calculation } = await create(productionCommand);
    const args = rpc.mock.calls[0]?.[1];
    const sourceItem = productionCommand.items[0];

    expect(args.p_items).toEqual(
      [
        {
          ...sourceItem,
          ...calculation.items[0],
          itemId: undefined,
        },
      ].map(({ itemId, ...item }) => {
        void itemId;
        return item;
      }),
    );
    expect(args.p_items[0].ingredients).toEqual(
      sourceItem.kind === "manufacturing" &&
        sourceItem.costMode === "technical_sheet"
        ? sourceItem.ingredients
        : [],
    );
  });

  it("maps nullable aggregate summaries for a partial mix", async () => {
    const partialCommand: DetailedDiagnosisCommand = {
      ...productCommand,
      items: productCommand.items.map((item, index) =>
        index === 0 ? { ...item, monthlySalesVolume: null } : item,
      ),
    };

    const { result, snapshot } = await create(partialCommand);

    expect(result).toEqual({ status: "success", diagnosisId: 42 });
    expect(rpc).toHaveBeenCalledWith(
      "create_detailed_diagnosis_report",
      expect.objectContaining({
        p_monthly_gross_revenue_cents: null,
        p_monthly_result_cents: null,
        p_real_margin_basis_points: null,
        p_is_partial: true,
        p_report_snapshot: snapshot,
      }),
    );
  });

  it("maps only the database free-report limit to limit_reached", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "free_report_limit_reached" },
    });

    await expect(
      create(productCommand).then(({ result }) => result),
    ).resolves.toEqual({ status: "error", error: "limit_reached" });

    rpc.mockResolvedValue({
      data: null,
      error: { code: "XX001", message: "free_report_limit_reached" },
    });
    await expect(
      create(productCommand).then(({ result }) => result),
    ).resolves.toEqual({ status: "error", error: "create_failed" });
  });

  it.each([null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "42"])(
    "returns a safe error for invalid RPC id %s",
    async (data) => {
      rpc.mockResolvedValue({ data, error: null });

      await expect(
        create(productCommand).then(({ result }) => result),
      ).resolves.toEqual({ status: "error", error: "create_failed" });
    },
  );

  it("sanitizes provider failures and thrown exceptions", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "XX001", message: "private provider detail" },
    });
    await expect(
      create(productCommand).then(({ result }) => result),
    ).resolves.toEqual({ status: "error", error: "create_failed" });

    rpc.mockRejectedValue(new Error("database failed for private@example.com"));
    await expect(
      create(productCommand).then(({ result }) => result),
    ).resolves.toEqual({ status: "error", error: "create_failed" });
  });
});
