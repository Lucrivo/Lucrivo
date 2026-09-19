import type { DetailedDiagnosisInput } from "@/modules/detailed-diagnosis/types";
import type { ServiceFlowSubmissionInput } from "@/modules/quick-diagnosis/domain/service-flow";
import type {
  ProductDiagnosisInput,
  ProductionDiagnosisInput,
} from "@/modules/quick-diagnosis/types";

import type { ReportSnapshot } from "../types";

type EditableReportDraft =
  | { kind: "service"; values: ServiceFlowSubmissionInput }
  | { kind: "product"; values: ProductDiagnosisInput }
  | { kind: "production"; values: ProductionDiagnosisInput }
  | { kind: "detailed"; values: DetailedDiagnosisInput };

type ReportPreviewResult =
  | { status: "valid"; snapshot: ReportSnapshot }
  | { status: "invalid"; fieldErrors: Record<string, string[]> };

type SaveReportEditResult =
  | { status: "success"; diagnosisId: number; version: number }
  | { status: "invalid"; fieldErrors: Record<string, string[]> }
  | { status: "plan_required" | "conflict" | "not_found" | "error" };

export type { EditableReportDraft, ReportPreviewResult, SaveReportEditResult };
