"use server";

import {
  AuthRequiredError,
  requireUser,
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
    const { supabase } = await requireUser();
    const command = composeServiceDiagnosisCommand(parsed.data);
    const calculation = calculateServiceReport(command);
    const snapshot = buildServiceReportSnapshot(command, calculation);

    return await createServiceReport({
      supabase,
      command,
      snapshot,
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return { status: "error", error: "unauthorized" };
    }

    return { status: "error", error: "create_failed" };
  }
}

type CreateServiceDiagnosisAction = typeof createServiceDiagnosis;

export { createServiceDiagnosis, type CreateServiceDiagnosisAction };
