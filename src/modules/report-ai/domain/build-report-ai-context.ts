import { isDetailedReportSnapshot } from "@/modules/reports/schemas/report-snapshot.schema";
import type { OwnedReport } from "@/modules/reports/services/get-report.service";

import { buildDetailedReportAiContext } from "./build-detailed-report-ai-context";
import { buildQuickReportAiContext } from "./build-quick-report-ai-context";

function serializeSafeContext(value: unknown): string {
  return JSON.stringify(value, (key, nestedValue: unknown) =>
    key === "help" ? undefined : nestedValue,
  );
}

function buildReportAiContext(report: OwnedReport): string {
  if (isDetailedReportSnapshot(report.snapshot)) {
    return serializeSafeContext(buildDetailedReportAiContext(report));
  }
  return serializeSafeContext(buildQuickReportAiContext(report));
}

export { buildReportAiContext };
