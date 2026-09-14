import { z } from "zod";

import { productReportSnapshotSchema } from "./product-report-snapshot.schema";
import { productionReportSnapshotSchema } from "./production-report-snapshot.schema";
import { serviceReportSnapshotSchema } from "./service-report-snapshot.schema";

const reportSnapshotSchema = z.union([
  serviceReportSnapshotSchema,
  productReportSnapshotSchema,
  productionReportSnapshotSchema,
]);

type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;
type ReportDiscountSimulationBase = ReportSnapshot["discountSimulationBase"];

function parseReportSnapshot(value: unknown): ReportSnapshot {
  return reportSnapshotSchema.parse(value);
}

export {
  parseReportSnapshot,
  reportSnapshotSchema,
  type ReportDiscountSimulationBase,
  type ReportSnapshot,
};
