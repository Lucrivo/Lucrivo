import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";

import type { CurrentDetailedReportSnapshot } from "../schemas/detailed-report-snapshot.schema";
import { toDetailedRpcArgs } from "./report-rpc-args";

type CreateDetailedReportInput = {
  supabase: SupabaseClient<Database>;
  command: DetailedDiagnosisCommand;
  snapshot: CurrentDetailedReportSnapshot;
};

type CreateDetailedReportResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" | "limit_reached" };

type GeneratedDetailedRpcArgs =
  Database["public"]["Functions"]["create_detailed_diagnosis_report"]["Args"];

async function createDetailedReport({
  supabase,
  command,
  snapshot,
}: CreateDetailedReportInput): Promise<CreateDetailedReportResult> {
  try {
    const rpcArgs = toDetailedRpcArgs(command, snapshot);
    const { data, error } = await supabase.rpc(
      "create_detailed_diagnosis_report",
      rpcArgs as GeneratedDetailedRpcArgs,
    );

    if (
      error?.code === "P0001" &&
      error.message === "free_report_limit_reached"
    ) {
      return { status: "error", error: "limit_reached" };
    }

    if (
      error ||
      typeof data !== "number" ||
      !Number.isSafeInteger(data) ||
      data <= 0
    ) {
      return { status: "error", error: "create_failed" };
    }

    return { status: "success", diagnosisId: data };
  } catch {
    return { status: "error", error: "create_failed" };
  }
}

export {
  createDetailedReport,
  type CreateDetailedReportInput,
  type CreateDetailedReportResult,
};
