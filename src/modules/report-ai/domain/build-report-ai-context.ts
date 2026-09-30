import { toDetailedReportViewModel } from "@/modules/reports/presenters/to-detailed-report-view-model";
import { toReportViewModel } from "@/modules/reports/presenters/to-report-view-model";
import { isDetailedReportSnapshot } from "@/modules/reports/schemas/report-snapshot.schema";
import type { OwnedReport } from "@/modules/reports/services/get-report.service";

function serializeSafeContext(value: unknown): string {
  return JSON.stringify(value, (key, nestedValue: unknown) =>
    key === "help" ? undefined : nestedValue,
  );
}

function buildReportAiContext(report: OwnedReport): string {
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

  const visible = toReportViewModel(report);

  return serializeSafeContext({
    ...base,
    identity: visible.identity,
    executiveSummary: visible.executiveSummary,
    numbers: visible.numbers,
    sections: visible.sections,
  });
}

export { buildReportAiContext };
