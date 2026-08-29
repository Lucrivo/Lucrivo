import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/infrastructure/database/supabase/database.types";

const REPORTS_PAGE_SIZE = 12;
const REPORT_SUMMARY_COLUMNS =
  "id, business_category, scenario, created_at, current_price_cents, real_margin_basis_points, unit_profit_cents, verdict, priority, unit" as const;

const reportsCursorSchema = z.strictObject({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

type ReportsCursor = z.infer<typeof reportsCursorSchema>;
type DiagnosisRow = Database["public"]["Tables"]["diagnoses"]["Row"];

type OwnedReportSummary = {
  id: number;
  businessCategory: DiagnosisRow["business_category"];
  scenario: string;
  createdAt: string;
  currentPriceCents: number;
  realMarginBasisPoints: number | null;
  unitProfitCents: number | null;
  verdict: string;
  priority: string;
  unit: string;
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

function toOwnedReportSummary(
  row: Pick<
    DiagnosisRow,
    | "id"
    | "business_category"
    | "scenario"
    | "created_at"
    | "current_price_cents"
    | "real_margin_basis_points"
    | "unit_profit_cents"
    | "verdict"
    | "priority"
    | "unit"
  >,
): OwnedReportSummary {
  return {
    id: row.id,
    businessCategory: row.business_category,
    scenario: row.scenario,
    createdAt: row.created_at,
    currentPriceCents: row.current_price_cents,
    realMarginBasisPoints: row.real_margin_basis_points,
    unitProfitCents: row.unit_profit_cents,
    verdict: row.verdict,
    priority: row.priority,
    unit: row.unit,
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
      .eq("user_id", userId);

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
