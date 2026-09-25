import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";
import type {
  NormalizedServiceDiagnosisCommand,
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";

import type {
  CurrentDetailedReportSnapshot,
  CurrentProductReportSnapshot,
  CurrentProductionReportSnapshot,
  CurrentServiceReportSnapshot,
} from "../types";
import {
  toDetailedRpcArgs,
  toProductRpcArgs,
  toProductionRpcArgs,
  toServiceRpcArgs,
} from "./report-rpc-args";

type ReplaceReportBase = {
  supabase: SupabaseClient<Database>;
  diagnosisId: number;
  expectedVersion: number;
};

type ReplaceReportInput = ReplaceReportBase &
  (
    | {
        kind: "service";
        command: NormalizedServiceDiagnosisCommand;
        snapshot: CurrentServiceReportSnapshot;
      }
    | {
        kind: "product";
        command: ProductDiagnosisCommand;
        snapshot: CurrentProductReportSnapshot;
      }
    | {
        kind: "production";
        command: ProductionDiagnosisCommand;
        snapshot: CurrentProductionReportSnapshot;
      }
    | {
        kind: "detailed";
        command: DetailedDiagnosisCommand;
        snapshot: CurrentDetailedReportSnapshot;
      }
  );

type ReplaceReportResult =
  | { status: "success"; diagnosisId: number; version: number }
  | { status: "plan_required" | "conflict" | "not_found" | "error" };

function mapReplacementError(
  error: { code?: string; message?: string } | null,
): Exclude<ReplaceReportResult, { status: "success" }> | null {
  if (!error) return null;
  if (error.code === "42501" && error.message === "paid access required")
    return { status: "plan_required" };
  if (error.code === "40001") return { status: "conflict" };
  if (error.code === "22023" && error.message === "report not found")
    return { status: "not_found" };
  return { status: "error" };
}

async function replaceReport(
  input: ReplaceReportInput,
): Promise<ReplaceReportResult> {
  const commonArgs = {
    p_diagnosis_id: input.diagnosisId,
    p_expected_version: input.expectedVersion,
  };

  try {
    let response: {
      data: number | null;
      error: { code?: string; message?: string } | null;
    };

    switch (input.kind) {
      case "service":
        response = await input.supabase.rpc(
          "replace_service_diagnosis_report_v1",
          {
            ...toServiceRpcArgs(input.command, input.snapshot),
            ...commonArgs,
          } as Database["public"]["Functions"]["replace_service_diagnosis_report_v1"]["Args"],
        );
        break;
      case "product":
        response = await input.supabase.rpc(
          "replace_product_diagnosis_report_v1",
          {
            ...toProductRpcArgs(input.command, input.snapshot),
            ...commonArgs,
          } as Database["public"]["Functions"]["replace_product_diagnosis_report_v1"]["Args"],
        );
        break;
      case "production":
        response = await input.supabase.rpc(
          "replace_production_diagnosis_report_v1",
          {
            ...toProductionRpcArgs(input.command, input.snapshot),
            ...commonArgs,
          } as Database["public"]["Functions"]["replace_production_diagnosis_report_v1"]["Args"],
        );
        break;
      case "detailed":
        response = await input.supabase.rpc(
          "replace_detailed_diagnosis_report_v1",
          {
            ...toDetailedRpcArgs(input.command, input.snapshot),
            ...commonArgs,
          } as Database["public"]["Functions"]["replace_detailed_diagnosis_report_v1"]["Args"],
        );
        break;
    }

    const mappedError = mapReplacementError(response.error);
    if (mappedError) return mappedError;
    if (response.data !== input.diagnosisId) return { status: "error" };

    return {
      status: "success",
      diagnosisId: input.diagnosisId,
      version: input.expectedVersion + 1,
    };
  } catch {
    return { status: "error" };
  }
}

export { replaceReport, type ReplaceReportInput, type ReplaceReportResult };
