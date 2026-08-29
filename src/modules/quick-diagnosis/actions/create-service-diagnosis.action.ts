"use server";

import {
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";
import { buildServiceReportSnapshot } from "@/modules/reports/domain/build-service-report-snapshot";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";
import { createServiceReport } from "@/modules/reports/services/create-service-report.service";

import { serviceDiagnosisSchema } from "../schemas/service-diagnosis.schema";
import type {
  CreateServiceDiagnosisActionResult,
  ServiceDiagnosisInput,
} from "../types";

async function createServiceDiagnosis(
  input: ServiceDiagnosisInput,
): Promise<CreateServiceDiagnosisActionResult> {
  const parsed = serviceDiagnosisSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      error: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase } = await requireUser();
    const calculation = calculateServiceReport(parsed.data);
    const snapshot = buildServiceReportSnapshot(parsed.data, calculation);

    return await createServiceReport({
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

export { createServiceDiagnosis };
