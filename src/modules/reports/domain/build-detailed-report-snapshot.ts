import { buildDetailedGuidance } from "@/modules/detailed-diagnosis/domain/build-detailed-guidance";
import type {
  DetailedDiagnosisCalculation,
  DetailedDiagnosisCommand,
} from "@/modules/detailed-diagnosis/types";

import {
  parseDetailedReportSnapshot,
  type CurrentDetailedReportSnapshot,
} from "../schemas/detailed-report-snapshot.schema";
import {
  DETAILED_REPORT_CALCULATION_VERSION,
  DETAILED_REPORT_CONTENT_VERSION,
  DETAILED_REPORT_SCHEMA_VERSION,
} from "../types";
import { buildDetailedReportContent } from "./build-detailed-report-content";

function buildDetailedReportSnapshot(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): CurrentDetailedReportSnapshot {
  const orderedItems = [...command.items]
    .sort((left, right) => left.position - right.position)
    .map((item) =>
      item.kind === "manufacturing" && item.costMode === "technical_sheet"
        ? {
            ...item,
            ingredients: [...item.ingredients].sort(
              (left, right) => left.position - right.position,
            ),
          }
        : { ...item },
    );
  const orderedCalculation = {
    ...calculation,
    items: [...calculation.items].sort((left, right) => {
      const leftPosition =
        orderedItems.find((item) => item.id === left.itemId)?.position ?? 0;
      const rightPosition =
        orderedItems.find((item) => item.id === right.itemId)?.position ?? 0;
      return leftPosition - rightPosition;
    }),
  };
  const orderedCommand = { ...command, items: orderedItems };
  const content = buildDetailedReportContent(
    orderedCommand,
    orderedCalculation,
  );

  return parseDetailedReportSnapshot({
    schemaVersion: DETAILED_REPORT_SCHEMA_VERSION,
    calculationVersion: DETAILED_REPORT_CALCULATION_VERSION,
    contentVersion: DETAILED_REPORT_CONTENT_VERSION,
    analysisMode: "detailed",
    category: command.category,
    scenario:
      command.category === "product"
        ? command.items[0]?.kind === "digital"
          ? "digital"
          : "resale"
        : "manufacturing",
    currency: "BRL",
    unit: "mix",
    policy: {
      concentrationThresholdBasisPoints: 4_500,
      weeklyDivisorHundredths: 433,
      operatingDaysPerWeek: 6,
      proLaboreIncluded: command.proLaboreIncluded,
    },
    inputs: orderedCommand,
    results: orderedCalculation,
    executiveSummary: content.executiveSummary,
    sections: content.sections,
    guidance: buildDetailedGuidance(orderedCommand, orderedCalculation),
  });
}

export { buildDetailedReportSnapshot };
