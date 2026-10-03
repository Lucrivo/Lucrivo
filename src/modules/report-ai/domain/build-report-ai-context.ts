import { toDetailedReportViewModel } from "@/modules/reports/presenters/to-detailed-report-view-model";
import { isDetailedReportSnapshot } from "@/modules/reports/schemas/report-snapshot.schema";
import type { OwnedReport } from "@/modules/reports/services/get-report.service";

import { buildQuickReportAiContext } from "./build-quick-report-ai-context";

function serializeSafeContext(value: unknown): string {
  return JSON.stringify(value, (key, nestedValue: unknown) =>
    key === "help" ? undefined : nestedValue,
  );
}

function buildLegacyDetailedReportAiContext(report: OwnedReport): string {
  const base = {
    reportId: report.id,
    reportVersion: report.version,
    category: report.snapshot.category,
    scenario: report.snapshot.scenario,
  };

  if (isDetailedReportSnapshot(report.snapshot)) {
    const visible = toDetailedReportViewModel({
      id: report.id,
      createdAt: report.createdAt,
      snapshot: report.snapshot,
    });

    return serializeSafeContext({
      ...base,
      identity: visible.identity,
      executiveSummary: visible.executiveSummary,
      numbers: visible.numbers,
      sections: visible.sections,
      comparison: visible.comparison.map(({ id, ...entry }) => {
        void id;
        return entry;
      }),
      items: visible.items.map(
        ({ id, technicalDetails, discountSimulationBase, ...item }) => {
          void id;
          void discountSimulationBase;
          return {
            ...item,
            technicalDetails: technicalDetails
              ? {
                  ...technicalDetails,
                  ingredients: technicalDetails.ingredients.map(
                    ({ id: ingredientId, ...ingredient }) => {
                      void ingredientId;
                      return ingredient;
                    },
                  ),
                }
              : null,
          };
        },
      ),
      secondaryGuidance: visible.secondaryGuidance,
    });
  }

  throw new Error("legacy_detailed_context_requires_detailed_snapshot");
}

function buildReportAiContext(report: OwnedReport): string {
  if (isDetailedReportSnapshot(report.snapshot)) {
    return buildLegacyDetailedReportAiContext(report);
  }
  return serializeSafeContext(buildQuickReportAiContext(report));
}

export { buildReportAiContext };
