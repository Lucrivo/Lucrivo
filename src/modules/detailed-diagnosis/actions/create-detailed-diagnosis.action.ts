"use server";

import {
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";
import { buildDetailedReportSnapshot } from "@/modules/reports/domain/build-detailed-report-snapshot";
import { createDetailedReport } from "@/modules/reports/services/create-detailed-report.service";

import { calculateDetailedDiagnosis } from "../domain/calculate-detailed-diagnosis";
import { detailedDiagnosisSchema } from "../schemas/detailed-diagnosis.schema";
import type {
  CreateDetailedDiagnosisActionResult,
  DetailedDiagnosisFieldErrors,
  DetailedDiagnosisInput,
} from "../types";

function invalidDetailedInput(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): CreateDetailedDiagnosisActionResult {
  const fieldErrors: DetailedDiagnosisFieldErrors = {};

  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    fieldErrors[path] = [...(fieldErrors[path] ?? []), issue.message];
  }

  return { status: "error", error: "invalid_input", fieldErrors };
}

async function createDetailedDiagnosis(
  input: DetailedDiagnosisInput,
): Promise<CreateDetailedDiagnosisActionResult> {
  const parsed = detailedDiagnosisSchema.safeParse(input);
  if (!parsed.success) return invalidDetailedInput(parsed.error);

  try {
    const { supabase } = await requireUser();
    const calculation = calculateDetailedDiagnosis(parsed.data);
    const snapshot = buildDetailedReportSnapshot(parsed.data, calculation);

    return await createDetailedReport({
      supabase,
      command: parsed.data,
      snapshot,
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return { status: "error", error: "unauthorized" };
    }

    return { status: "error", error: "create_failed" };
  }
}

export { createDetailedDiagnosis };
