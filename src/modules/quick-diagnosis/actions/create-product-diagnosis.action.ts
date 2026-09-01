"use server";

import {
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";
import { buildProductReportSnapshot } from "@/modules/reports/domain/build-product-report-snapshot";
import { calculateProductReport } from "@/modules/reports/domain/calculate-product-report";
import { createProductReport } from "@/modules/reports/services/create-product-report.service";

import { productDiagnosisSchema } from "../schemas/product-diagnosis.schema";
import type {
  CreateProductDiagnosisActionResult,
  ProductDiagnosisInput,
} from "../types";

async function createProductDiagnosis(
  input: ProductDiagnosisInput,
): Promise<CreateProductDiagnosisActionResult> {
  const parsed = productDiagnosisSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      error: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase } = await requireUser();
    const calculation = calculateProductReport(parsed.data);
    const snapshot = buildProductReportSnapshot(parsed.data, calculation);

    return await createProductReport({
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

export { createProductDiagnosis };
