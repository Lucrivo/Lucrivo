import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import { calculateDetailedSalesGoal } from "../domain/calculate-detailed-sales-goal";
import type { ReportSnapshot } from "../types";

const REPORTS_PAGE_SIZE = 12;
const REPORT_SUMMARY_COLUMNS =
  "id, business_category, scenario, created_at, analysis_mode, current_price_cents, real_margin_basis_points, unit_profit_cents, verdict, priority, unit, schema_version, calculation_version, content_version, monthly_gross_revenue_cents, monthly_result_cents, item_count, is_partial, snapshot_monthly_sales_goal:report_snapshot->results->monthlySalesGoal, snapshot_monthly_sales_volume_used:report_snapshot->results->monthlySalesVolumeUsed, snapshot_input_items:report_snapshot->inputs->items, snapshot_result_items:report_snapshot->results->items, snapshot_effective_fixed_cost_cents:report_snapshot->results->effectiveFixedCostCents, snapshot_monthly_contribution_cents:report_snapshot->results->monthlyContributionCents" as const;

const reportsCursorSchema = z.strictObject({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

type ReportsCursor = z.infer<typeof reportsCursorSchema>;
type DiagnosisRow = Database["public"]["Tables"]["diagnoses"]["Row"];
type ReportSummaryRow = Pick<
  DiagnosisRow,
  | "id"
  | "business_category"
  | "scenario"
  | "created_at"
  | "analysis_mode"
  | "current_price_cents"
  | "real_margin_basis_points"
  | "unit_profit_cents"
  | "verdict"
  | "priority"
  | "unit"
  | "schema_version"
  | "calculation_version"
  | "content_version"
  | "monthly_gross_revenue_cents"
  | "monthly_result_cents"
  | "item_count"
  | "is_partial"
> & {
  snapshot_monthly_sales_goal: unknown;
  snapshot_monthly_sales_volume_used: unknown;
  snapshot_input_items: unknown;
  snapshot_result_items: unknown;
  snapshot_effective_fixed_cost_cents: unknown;
  snapshot_monthly_contribution_cents: unknown;
};

const nullableSafeIntegerSchema = z.number().int().safe().nullable();
const detailedSalesFragmentsSchema = z.object({
  inputItems: z.array(
    z.object({ monthlySalesVolume: nullableSafeIntegerSchema }),
  ),
  resultItems: z.array(
    z.object({ unitContributionCents: z.number().int().safe() }),
  ),
  effectiveFixedCostCents: z.number().int().safe().nonnegative(),
  monthlyContributionCents: nullableSafeIntegerSchema,
});

type OwnedReportSummary = {
  id: number;
  businessCategory: DiagnosisRow["business_category"];
  scenario: string;
  createdAt: string;
  analysisMode: "quick" | "detailed";
  currentPriceCents: number | null;
  realMarginBasisPoints: number | null;
  unitProfitCents: number | null;
  verdict: string;
  priority: string;
  unit: string;
  schemaVersion: ReportSnapshot["schemaVersion"];
  calculationVersion: ReportSnapshot["calculationVersion"];
  contentVersion: ReportSnapshot["contentVersion"];
  monthlyGrossRevenueCents: number | null;
  monthlyResultCents: number | null;
  itemCount: number | null;
  isPartial: boolean | null;
  monthlySalesGoal: number | null;
  monthlySalesVolume: number | null;
};

type ListOwnedReportsInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  cursor?: string;
  pageSize?: number;
};

type ListOwnedReportsResult =
  | {
      status: "success";
      reports: OwnedReportSummary[];
      nextCursor: string | null;
    }
  | { status: "read_failed" };

function encodeReportsCursor(cursor: ReportsCursor): string {
  const parsed = reportsCursorSchema.parse(cursor);
  return Buffer.from(JSON.stringify(parsed), "utf8").toString("base64url");
}

function decodeReportsCursor(cursor: string): ReportsCursor | null {
  if (cursor.length === 0) return null;

  try {
    const value: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    const parsed = reportsCursorSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function normalizePageSize(value: number | undefined): number {
  return Number.isInteger(value) &&
    value !== undefined &&
    value > 0 &&
    value <= 50
    ? value
    : REPORTS_PAGE_SIZE;
}

function parseNullableSafeInteger(value: unknown): number | null {
  const parsed = nullableSafeIntegerSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function toSalesMetrics(
  row: ReportSummaryRow,
): Pick<OwnedReportSummary, "monthlySalesGoal" | "monthlySalesVolume"> {
  if (row.analysis_mode !== "detailed") {
    return {
      monthlySalesGoal: parseNullableSafeInteger(
        row.snapshot_monthly_sales_goal,
      ),
      monthlySalesVolume:
        row.business_category === "service"
          ? null
          : parseNullableSafeInteger(row.snapshot_monthly_sales_volume_used),
    };
  }

  const fragments = detailedSalesFragmentsSchema.safeParse({
    inputItems: row.snapshot_input_items,
    resultItems: row.snapshot_result_items,
    effectiveFixedCostCents: row.snapshot_effective_fixed_cost_cents,
    monthlyContributionCents: row.snapshot_monthly_contribution_cents,
  });
  if (!fragments.success) {
    return { monthlySalesGoal: null, monthlySalesVolume: null };
  }

  const { inputItems, resultItems, ...results } = fragments.data;
  const goal = calculateDetailedSalesGoal(
    { items: inputItems },
    {
      ...results,
      isPartial: row.is_partial ?? true,
      items: resultItems,
    },
    { weeklyDivisorHundredths: 433, operatingDaysPerWeek: 6 },
  );
  const monthlySalesVolume = row.is_partial
    ? null
    : inputItems.reduce((sum, item) => sum + (item.monthlySalesVolume ?? 0), 0);

  return {
    monthlySalesGoal: goal.available ? goal.monthly : null,
    monthlySalesVolume,
  };
}

function toOwnedReportSummary(row: ReportSummaryRow): OwnedReportSummary {
  const salesMetrics = toSalesMetrics(row);

  return {
    id: row.id,
    businessCategory: row.business_category,
    scenario: row.scenario,
    createdAt: row.created_at,
    analysisMode: row.analysis_mode as "quick" | "detailed",
    currentPriceCents: row.current_price_cents,
    realMarginBasisPoints: row.real_margin_basis_points,
    unitProfitCents: row.unit_profit_cents,
    verdict: row.verdict,
    priority: row.priority,
    unit: row.unit,
    schemaVersion: row.schema_version as ReportSnapshot["schemaVersion"],
    calculationVersion:
      row.calculation_version as ReportSnapshot["calculationVersion"],
    contentVersion: row.content_version as ReportSnapshot["contentVersion"],
    monthlyGrossRevenueCents: row.monthly_gross_revenue_cents,
    monthlyResultCents: row.monthly_result_cents,
    itemCount: row.item_count,
    isPartial: row.is_partial,
    ...salesMetrics,
  };
}

async function listOwnedReports({
  supabase,
  userId,
  cursor,
  pageSize: requestedPageSize,
}: ListOwnedReportsInput): Promise<ListOwnedReportsResult> {
  const pageSize = normalizePageSize(requestedPageSize);
  const decodedCursor = cursor ? decodeReportsCursor(cursor) : null;

  try {
    let query = supabase
      .from("diagnoses")
      .select(REPORT_SUMMARY_COLUMNS)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (decodedCursor) {
      query = query.or(
        `created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`,
      );
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (error || !data) return { status: "read_failed" };

    const pageRows = data.slice(0, pageSize);
    const reports = pageRows.map(toOwnedReportSummary);
    const lastReport = reports.at(-1);
    const nextCursor =
      data.length > pageSize && lastReport
        ? encodeReportsCursor({
            createdAt: lastReport.createdAt,
            id: lastReport.id,
          })
        : null;

    return { status: "success", reports, nextCursor };
  } catch {
    return { status: "read_failed" };
  }
}

export {
  REPORTS_PAGE_SIZE,
  REPORT_SUMMARY_COLUMNS,
  decodeReportsCursor,
  encodeReportsCursor,
  listOwnedReports,
  type ListOwnedReportsInput,
  type ListOwnedReportsResult,
  type OwnedReportSummary,
  type ReportsCursor,
};
