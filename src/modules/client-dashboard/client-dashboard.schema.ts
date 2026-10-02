import { z } from "zod";

import {
  DETAILED_REPORT_CALCULATION_VERSION,
  DETAILED_REPORT_CONTENT_VERSION,
  DETAILED_REPORT_SCHEMA_VERSION,
  PRODUCT_CALCULATION_VERSION,
  PRODUCT_CONTENT_VERSION,
  PRODUCT_REPORT_SCHEMA_VERSION,
  PRODUCTION_CALCULATION_VERSION,
  PRODUCTION_CONTENT_VERSION,
  PRODUCTION_REPORT_SCHEMA_VERSION,
  SERVICE_REPORT_CALCULATION_VERSION,
  SERVICE_REPORT_CONTENT_VERSION,
  SERVICE_REPORT_SCHEMA_VERSION,
  reportPriorities,
  reportScenarios,
  reportVerdicts,
} from "@/modules/reports/types";

const nonnegativeSafeCountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
const safeIntegerSchema = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const positiveIdSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const dashboardCategorySchema = z.enum(["service", "product", "production"]);
const dashboardModeSchema = z.enum(["quick", "detailed"]);
const reportScenarioSchema = z.enum(reportScenarios);
const reportVerdictSchema = z.enum(reportVerdicts);
const reportPrioritySchema = z.enum(reportPriorities);

const dashboardFiltersSchema = z.strictObject({
  from: z.iso.date().nullable(),
  to: z.iso.date().nullable(),
  categories: z.array(dashboardCategorySchema).max(3),
  modes: z.array(dashboardModeSchema).max(2),
  scenarios: z.array(reportScenarioSchema).max(9),
  verdicts: z.array(reportVerdictSchema).max(7),
  priorities: z.array(reportPrioritySchema).max(5),
  dataState: z.enum(["all", "complete", "pending"]),
});

const dashboardMetricsSchema = z.strictObject({
  totalReports: nonnegativeSafeCountSchema,
  positiveResultReports: nonnegativeSafeCountSchema,
  lossReports: nonnegativeSafeCountSchema,
  pendingDataReports: nonnegativeSafeCountSchema,
});

const verdictCountSchema = z.strictObject({
  verdict: reportVerdictSchema,
  count: nonnegativeSafeCountSchema,
});

const priorityCountSchema = z.strictObject({
  priority: reportPrioritySchema,
  count: nonnegativeSafeCountSchema,
});

const recentReportSchema = z
  .strictObject({
    id: positiveIdSchema,
    businessCategory: dashboardCategorySchema,
    scenario: reportScenarioSchema,
    analysisMode: dashboardModeSchema,
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    verdict: reportVerdictSchema,
    priority: reportPrioritySchema,
    hasPendingData: z.boolean(),
    itemCount: nonnegativeSafeCountSchema.nullable(),
    realMarginBasisPoints: safeIntegerSchema.nullable(),
    monthlyResultCents: safeIntegerSchema.nullable(),
    schemaVersion: nonnegativeSafeCountSchema,
    calculationVersion: nonnegativeSafeCountSchema,
    contentVersion: nonnegativeSafeCountSchema,
  })
  .superRefine((report, context) => {
    const expected =
      report.analysisMode === "detailed"
        ? {
            schemaVersion: DETAILED_REPORT_SCHEMA_VERSION,
            calculationVersion: DETAILED_REPORT_CALCULATION_VERSION,
            contentVersions: [1, DETAILED_REPORT_CONTENT_VERSION],
          }
        : report.businessCategory === "service"
          ? {
              schemaVersion: SERVICE_REPORT_SCHEMA_VERSION,
              calculationVersion: SERVICE_REPORT_CALCULATION_VERSION,
              contentVersions: [5, SERVICE_REPORT_CONTENT_VERSION],
            }
          : report.businessCategory === "product"
            ? {
                schemaVersion: PRODUCT_REPORT_SCHEMA_VERSION,
                calculationVersion: PRODUCT_CALCULATION_VERSION,
                contentVersions: [4, PRODUCT_CONTENT_VERSION],
              }
            : {
                schemaVersion: PRODUCTION_REPORT_SCHEMA_VERSION,
                calculationVersion: PRODUCTION_CALCULATION_VERSION,
                contentVersions: [4, PRODUCTION_CONTENT_VERSION],
              };

    if (
      report.analysisMode === "detailed" &&
      report.businessCategory === "service"
    ) {
      context.addIssue({
        code: "custom",
        path: ["analysisMode"],
        message: "service reports cannot use detailed analysis",
      });
    }

    for (const key of ["schemaVersion", "calculationVersion"] as const) {
      if (report[key] !== expected[key]) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `unsupported ${key}`,
        });
      }
    }

    if (!expected.contentVersions.includes(report.contentVersion)) {
      context.addIssue({
        code: "custom",
        path: ["contentVersion"],
        message: "unsupported contentVersion",
      });
    }
  });

function sameOrderedValues<Value extends string>(
  actual: readonly Value[],
  expected: readonly Value[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

const clientDashboardSnapshotSchema = z
  .strictObject({
    generatedAt: z.iso.datetime({ offset: true }),
    filters: dashboardFiltersSchema,
    hasAnyReports: z.boolean(),
    focusReportId: positiveIdSchema.nullable(),
    metrics: dashboardMetricsSchema,
    verdictCounts: z.array(verdictCountSchema).length(7),
    priorityCounts: z.array(priorityCountSchema).length(5),
    recentReports: z.array(recentReportSchema).max(6),
  })
  .superRefine((snapshot, context) => {
    if (
      !sameOrderedValues(
        snapshot.verdictCounts.map(({ verdict }) => verdict),
        reportVerdicts,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["verdictCounts"],
        message: "verdict counts must use canonical order",
      });
    }

    if (
      !sameOrderedValues(
        snapshot.priorityCounts.map(({ priority }) => priority),
        reportPriorities,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["priorityCounts"],
        message: "priority counts must use canonical order",
      });
    }
  });

type ClientDashboardSnapshot = z.infer<typeof clientDashboardSnapshotSchema>;

export {
  clientDashboardSnapshotSchema,
  nonnegativeSafeCountSchema,
  type ClientDashboardSnapshot,
};
