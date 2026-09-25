"use server";

import { revalidatePath } from "next/cache";

import {
  AccountUnavailableError,
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";

type DeleteReportResult =
  { status: "success" } | { status: "conflict" | "not_found" | "error" };

async function deleteReport(input: {
  diagnosisId: number;
  expectedVersion: number;
}): Promise<DeleteReportResult> {
  if (
    !Number.isSafeInteger(input.diagnosisId) ||
    input.diagnosisId <= 0 ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion < 0
  ) {
    return { status: "error" };
  }

  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc(
      "soft_delete_owned_diagnosis_v1",
      {
        p_diagnosis_id: input.diagnosisId,
        p_expected_version: input.expectedVersion,
      },
    );

    if (error) return { status: "error" };
    if (data === "deleted") {
      revalidatePath("/reports");
      return { status: "success" };
    }
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
