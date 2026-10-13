import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type { CurrentServiceReportSnapshot } from "../types";
import { toServiceRpcArgs } from "./report-rpc-args";

type CreateServiceReportInput = {
  supabase: SupabaseClient<Database>;
  command: NormalizedServiceDiagnosisCommand;
  snapshot: CurrentServiceReportSnapshot;
};

type CreateServiceReportResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" | "limit_reached" };

type GeneratedRpcArgs =
  Database["public"]["Functions"]["create_service_diagnosis_report_v4"]["Args"];

async function createServiceReport({
  supabase,
  command,
  snapshot,
}: CreateServiceReportInput): Promise<CreateServiceReportResult> {
  try {
    const rpcArgs = toServiceRpcArgs(command, snapshot);
    const { data, error } = await supabase.rpc(
      "create_service_diagnosis_report_v4",
      rpcArgs as GeneratedRpcArgs,
    );

    if (
      error?.code === "P0001" &&
      error.message === "free_report_limit_reached"
    ) {
      return { status: "error", error: "limit_reached" };
    }

    if (
      error ||
      !Number.isSafeInteger(data) ||
      typeof data !== "number" ||
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
  createServiceReport,
  type CreateServiceReportInput,
  type CreateServiceReportResult,
};
