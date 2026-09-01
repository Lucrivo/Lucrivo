import { z } from "zod";

import {
  productReportSnapshotV1Schema,
  type ProductReportDiscountSimulationBase,
} from "./product-report-snapshot.schema";
import {
  productionReportSnapshotV1Schema,
  type ProductionReportDiscountSimulationBase,
} from "./production-report-snapshot.schema";
import {
  serviceReportSnapshotV2Schema,
  type ServiceReportDiscountSimulationBase,
} from "./service-report-snapshot.schema";

const reportSnapshotSchema = z.discriminatedUnion("category", [
  serviceReportSnapshotV2Schema,
  productReportSnapshotV1Schema,
  productionReportSnapshotV1Schema,
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
