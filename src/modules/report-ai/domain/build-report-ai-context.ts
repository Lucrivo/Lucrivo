import { isDetailedReportSnapshot } from "@/modules/reports/schemas/report-snapshot.schema";
import type { OwnedReport } from "@/modules/reports/services/get-report.service";

import { buildDetailedReportAiContext } from "./build-detailed-report-ai-context";
import { buildQuickReportAiContext } from "./build-quick-report-ai-context";
import type { ReportAiBusinessContext } from "./report-ai-context.types";

function serializeSafeContext(value: unknown): string {
  return JSON.stringify(value, (key, nestedValue: unknown) =>
    key === "help" ? undefined : nestedValue,
  );
}

function buildReportAiContext(
  report: OwnedReport,
  businessContext?: ReportAiBusinessContext | null,
): string {
  const reportContext = isDetailedReportSnapshot(report.snapshot)
    ? buildDetailedReportAiContext(report)
    : buildQuickReportAiContext(report);

  return serializeSafeContext({
    ...reportContext,
    ...(businessContext == null ? {} : { businessContext }),
  });
}

export { buildReportAiContext };
