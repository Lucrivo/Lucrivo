"use server";

import { refresh } from "next/cache";

import {
  AuthRequiredError,
  LegalAcceptanceRequiredError,
  requireClientAccess,
} from "@/modules/auth/services/require-user";
import { buildServiceReportSnapshot } from "@/modules/reports/domain/build-service-report-snapshot";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";
import { createServiceReport } from "@/modules/reports/services/create-service-report.service";

import { composeServiceDiagnosisCommand } from "../domain/compose-service-diagnosis-command";
import type { ServiceFlowSubmissionInput } from "../domain/service-flow";
import { serviceFlowSubmissionSchema } from "../schemas/service-flow.schema";
import type { CreateServiceDiagnosisActionResult } from "../types";

async function createServiceDiagnosis(
  input: ServiceFlowSubmissionInput,
): Promise<CreateServiceDiagnosisActionResult> {
  const parsed = serviceFlowSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      error: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase } = await requireClientAccess();
    const command = composeServiceDiagnosisCommand(parsed.data);
    const calculation = calculateServiceReport(command);
    const snapshot = buildServiceReportSnapshot(command, calculation);

    const result = await createServiceReport({
      supabase,
      command,
      snapshot,
    });
    if (result.status === "success") refresh();
    return result;
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      error instanceof LegalAcceptanceRequiredError
    ) {
      return { status: "error", error: "unauthorized" };
    }

    return { status: "error", error: "create_failed" };
  }
}

type CreateServiceDiagnosisAction = typeof createServiceDiagnosis;

export { createServiceDiagnosis, type CreateServiceDiagnosisAction };
