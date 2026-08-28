"use server";

import {
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";

import { serviceDiagnosisSchema } from "../schemas/service-diagnosis.schema";
import { createServiceDiagnosisService } from "../services/create-service-diagnosis.service";
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
    const { userId, supabase } = await requireUser();

    return await createServiceDiagnosisService({
      userId,
      supabase,
      command: parsed.data,
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return { status: "error", error: "unauthorized" };
    }

    return { status: "error", error: "create_failed" };
  }
}

export { createServiceDiagnosis };
