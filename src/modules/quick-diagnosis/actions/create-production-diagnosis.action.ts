"use server";

import { refresh } from "next/cache";

import {
  AuthRequiredError,
  LegalAcceptanceRequiredError,
  requireClientAccess,
} from "@/modules/auth/services/require-user";
import { buildProductionReportSnapshot } from "@/modules/reports/domain/build-production-report-snapshot";
import { calculateProductionReport } from "@/modules/reports/domain/calculate-production-report";
import { createProductionReport } from "@/modules/reports/services/create-production-report.service";

import { composeProductionDiagnosisCommand } from "../domain/compose-production-diagnosis-command";
import { productionDiagnosisSchema } from "../schemas/production-diagnosis.schema";
import type {
  CreateProductionDiagnosisActionResult,
  ProductionDiagnosisInput,
} from "../types";

async function createProductionDiagnosis(
  input: ProductionDiagnosisInput,
): Promise<CreateProductionDiagnosisActionResult> {
  const parsed = productionDiagnosisSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      error: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase } = await requireClientAccess();
    const command = composeProductionDiagnosisCommand(parsed.data);
    const calculation = calculateProductionReport(command);
    const snapshot = buildProductionReportSnapshot(command, calculation);

    const result = await createProductionReport({
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

export { createProductionDiagnosis };
