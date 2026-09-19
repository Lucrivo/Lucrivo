import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";

type ReplaceReportInput = {
  supabase: SupabaseClient<Database>;
  targetId: number;
  stagedId: number;
  expectedVersion: number;
};

type ReplaceReportResult =
  | { status: "success"; diagnosisId: number; version: number }
  | { status: "plan_required" | "conflict" | "not_found" | "error" };

async function replaceReport({
  supabase,
  targetId,
  stagedId,
  expectedVersion,
}: ReplaceReportInput): Promise<ReplaceReportResult> {
  try {
    const { data, error } = await supabase.rpc(
      "replace_owned_diagnosis_from_staged_v1",
      {
        p_target_id: targetId,
        p_staged_id: stagedId,
        p_expected_version: expectedVersion,
      },
    );

    if (error?.code === "42501" && error.message === "paid access required")
      return { status: "plan_required" };
    if (error?.code === "40001") return { status: "conflict" };
    if (error?.code === "22023" && error.message === "report not found")
      return { status: "not_found" };
    if (error || data !== targetId) return { status: "error" };

    return {
      status: "success",
      diagnosisId: targetId,
      version: expectedVersion + 1,
    };
  } catch {
    return { status: "error" };
  }
}

export { replaceReport, type ReplaceReportInput, type ReplaceReportResult };
