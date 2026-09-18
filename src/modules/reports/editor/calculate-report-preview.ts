import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import { detailedDiagnosisSchema } from "@/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema";
import { composeProductionDiagnosisCommand } from "@/modules/quick-diagnosis/domain/compose-production-diagnosis-command";
import { composeServiceDiagnosisCommand } from "@/modules/quick-diagnosis/domain/compose-service-diagnosis-command";
import { productDiagnosisSchema } from "@/modules/quick-diagnosis/schemas/product-diagnosis.schema";
import { productionDiagnosisSchema } from "@/modules/quick-diagnosis/schemas/production-diagnosis.schema";
import { serviceFlowSubmissionSchema } from "@/modules/quick-diagnosis/schemas/service-flow.schema";

import { buildDetailedReportSnapshot } from "../domain/build-detailed-report-snapshot";
import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "../domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateProductionReport } from "../domain/calculate-production-report";
import { calculateServiceReport } from "../domain/calculate-service-report";
import type {
  EditableReportDraft,
  ReportPreviewResult,
} from "./report-editor.types";

function fieldErrors(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    errors[path] = [...(errors[path] ?? []), issue.message];
  }
  return errors;
}

function calculateReportPreview(
  draft: EditableReportDraft,
): ReportPreviewResult {
  try {
    switch (draft.kind) {
      case "service": {
        const parsed = serviceFlowSubmissionSchema.safeParse(draft.values);
        if (!parsed.success)
          return { status: "invalid", fieldErrors: fieldErrors(parsed.error) };
        const command = composeServiceDiagnosisCommand(parsed.data);
        return {
          status: "valid",
          snapshot: buildServiceReportSnapshot(
            command,
            calculateServiceReport(command),
          ),
        };
      }
      case "product": {
        const parsed = productDiagnosisSchema.safeParse(draft.values);
        if (!parsed.success)
          return { status: "invalid", fieldErrors: fieldErrors(parsed.error) };
        return {
          status: "valid",
          snapshot: buildProductReportSnapshot(
            parsed.data,
            calculateProductReport(parsed.data),
          ),
        };
      }
      case "production": {
        const parsed = productionDiagnosisSchema.safeParse(draft.values);
        if (!parsed.success)
          return { status: "invalid", fieldErrors: fieldErrors(parsed.error) };
        const command = composeProductionDiagnosisCommand(parsed.data);
        return {
          status: "valid",
          snapshot: buildProductionReportSnapshot(
            command,
            calculateProductionReport(command),
          ),
        };
      }
      case "detailed": {
        const parsed = detailedDiagnosisSchema.safeParse(draft.values);
        if (!parsed.success)
          return { status: "invalid", fieldErrors: fieldErrors(parsed.error) };
        return {
          status: "valid",
          snapshot: buildDetailedReportSnapshot(
            parsed.data,
            calculateDetailedDiagnosis(parsed.data),
          ),
        };
      }
    }
  } catch {
    return { status: "invalid", fieldErrors: {} };
  }
}

export { calculateReportPreview, fieldErrors };
