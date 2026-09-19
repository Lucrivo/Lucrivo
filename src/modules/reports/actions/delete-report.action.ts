"use server";

import {
  AccountUnavailableError,
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";

type DeleteReportResult =
  { status: "success" } | { status: "conflict" | "not_found" | "error" };

async function deleteReport(
  diagnosisId: number,
  expectedVersion: number,
): Promise<DeleteReportResult> {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc(
      "soft_delete_owned_diagnosis_v1",
      {
        p_diagnosis_id: diagnosisId,
        p_expected_version: expectedVersion,
      },
    );

    if (error) return { status: "error" };
    if (data === "deleted") return { status: "success" };
    if (data === "conflict") return { status: "conflict" };
    if (data === "not_found") return { status: "not_found" };
    return { status: "error" };
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof AccountUnavailableError
    )
      return { status: "error" };
    return { status: "error" };
  }
}

export { deleteReport, type DeleteReportResult };
