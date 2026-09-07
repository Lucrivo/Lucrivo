import { z } from "zod";

import {
  productReportSnapshotSchema,
  type ProductReportDiscountSimulationBase,
} from "./product-report-snapshot.schema";
import {
  productionReportSnapshotSchema,
  type ProductionReportDiscountSimulationBase,
} from "./production-report-snapshot.schema";
import {
  serviceReportSnapshotSchema,
  type ServiceReportDiscountSimulationBase,
} from "./service-report-snapshot.schema";

const reportSnapshotSchema = z.union([
  serviceReportSnapshotSchema,
  productReportSnapshotSchema,
  productionReportSnapshotSchema,
]);

type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;
type ReportDiscountSimulationBase =
  | ServiceReportDiscountSimulationBase
  | ProductReportDiscountSimulationBase
  | ProductionReportDiscountSimulationBase;

function parseReportSnapshot(value: unknown): ReportSnapshot {
  return reportSnapshotSchema.parse(value);
}

export {
  parseReportSnapshot,
  reportSnapshotSchema,
  type ReportDiscountSimulationBase,
  type ReportSnapshot,
};
