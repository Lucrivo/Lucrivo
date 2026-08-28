import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";

import { parseReportSnapshot } from "../schemas/report-snapshot.schema";
import type { ReportSnapshot } from "../types";

type GetOwnedReportInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  diagnosisId: string;
};

type OwnedReport = {
  id: number;
  createdAt: string;
  snapshot: ReportSnapshot;
};

type GetOwnedReportResult =
  | { status: "found"; report: OwnedReport }
  | { status: "not_found" }
  | {
      status: "unavailable";
      report: { id: number; createdAt: string };
    }
  | { status: "read_failed" };

function parseDiagnosisId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getOwnedReport({
  supabase,
  userId,
  diagnosisId,
}: GetOwnedReportInput): Promise<GetOwnedReportResult> {
  const parsedId = parseDiagnosisId(diagnosisId);
  if (parsedId === null) return { status: "not_found" };

  try {
    const { data, error } = await supabase
      .from("diagnoses")
      .select("id, business_category, scenario, created_at, report_snapshot")
      .eq("id", parsedId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return { status: "read_failed" };
    if (!data) return { status: "not_found" };

    try {
      const snapshot = parseReportSnapshot(data.report_snapshot);
      if (
        data.business_category !== snapshot.category ||
        data.scenario !== snapshot.scenario
      ) {
        throw new Error("snapshot_identity_mismatch");
      }

      return {
        status: "found",
        report: { id: data.id, createdAt: data.created_at, snapshot },
      };
    } catch {
      return {
        status: "unavailable",
        report: { id: data.id, createdAt: data.created_at },
      };
    }
  } catch {
    return { status: "read_failed" };
  }
}

export {
  getOwnedReport,
  parseDiagnosisId,
  type GetOwnedReportInput,
  type GetOwnedReportResult,
  type OwnedReport,
};
