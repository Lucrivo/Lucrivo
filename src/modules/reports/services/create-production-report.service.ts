import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type { CurrentProductionReportSnapshot } from "../types";
import { toProductionRpcArgs } from "./report-rpc-args";

type CreateProductionReportInput = {
  supabase: SupabaseClient<Database>;
  command: ProductionDiagnosisCommand;
  snapshot: CurrentProductionReportSnapshot;
};

type CreateProductionReportResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" | "limit_reached" };

type GeneratedProductionV3RpcArgs =
  Database["public"]["Functions"]["create_production_diagnosis_report_v3"]["Args"];

async function createProductionReport({
  supabase,
  command,
  snapshot,
}: CreateProductionReportInput): Promise<CreateProductionReportResult> {
  try {
    const rpcArgs = toProductionRpcArgs(command, snapshot);
    const { data, error } = await supabase.rpc(
      "create_production_diagnosis_report_v3",
      rpcArgs as GeneratedProductionV3RpcArgs,
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
  createProductionReport,
  type CreateProductionReportInput,
  type CreateProductionReportResult,
};
