import { z } from "zod";

import {
  detailedReportSnapshotSchema,
  type CurrentDetailedReportSnapshot,
} from "./detailed-report-snapshot.schema";
import { productReportSnapshotSchema } from "./product-report-snapshot.schema";
import { productionReportSnapshotSchema } from "./production-report-snapshot.schema";
import { serviceReportSnapshotSchema } from "./service-report-snapshot.schema";

const quickReportSnapshotSchema = z.union([
  serviceReportSnapshotSchema,
  productReportSnapshotSchema,
  productionReportSnapshotSchema,
]);
const reportSnapshotSchema = z.union([
  quickReportSnapshotSchema,
  detailedReportSnapshotSchema,
]);

type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;
type QuickReportSnapshot = z.infer<typeof quickReportSnapshotSchema>;
type ReportDiscountSimulationBase =
  QuickReportSnapshot["discountSimulationBase"];

function parseReportSnapshot(value: unknown): ReportSnapshot {
  if (
    typeof value === "object" &&
    value !== null &&
    "analysisMode" in value &&
    value.analysisMode === "detailed"
  ) {
    return detailedReportSnapshotSchema.parse(value);
  }
  return quickReportSnapshotSchema.parse(value);
}

function isDetailedReportSnapshot(
  snapshot: ReportSnapshot,
): snapshot is CurrentDetailedReportSnapshot {
  return "analysisMode" in snapshot && snapshot.analysisMode === "detailed";
}

export {
  isDetailedReportSnapshot,
  parseReportSnapshot,
  reportSnapshotSchema,
  type ReportDiscountSimulationBase,
  type ReportSnapshot,
  type QuickReportSnapshot,
};
