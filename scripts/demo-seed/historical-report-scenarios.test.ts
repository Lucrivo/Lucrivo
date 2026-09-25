import { describe, expect, it } from "vitest";

import { parseProductReportSnapshot } from "@/modules/reports/schemas/product-report-snapshot.schema";
import { parseProductionReportSnapshot } from "@/modules/reports/schemas/production-report-snapshot.schema";

import { buildSeedReportIds, currentReportTemplates } from "./report-scenarios";
import {
  allAdminReportTemplates,
  historicalReportTemplates,
} from "./historical-report-scenarios";

function argumentValue(
  report: ReturnType<(typeof historicalReportTemplates)[number]["materialize"]>,
  name: string,
): unknown {
  return report.rpc.arguments.find((argument) => argument.name === name)?.value;
}

describe("historical report scenario catalog", () => {
  it("preserves the two legacy above-target fixtures", () => {
    expect(
      historicalReportTemplates.map((template) => [
        template.category,
        template.analysisMode,
        template.expectedVerdict,
      ]),
    ).toEqual([
      ["product", "quick", "above_target"],
      ["production", "quick", "above_target"],
    ]);

    const [product, production] = historicalReportTemplates.map(
      (template, index) =>
        template.materialize(buildSeedReportIds(0, 34 + index)),
    );
    const productSnapshot = parseProductReportSnapshot(
      argumentValue(product!, "p_report_snapshot"),
    );
    const productionSnapshot = parseProductionReportSnapshot(
      argumentValue(production!, "p_report_snapshot"),
    );

    expect(productSnapshot).toMatchObject({
      schemaVersion: 1,
      calculationVersion: 1,
      contentVersion: 2,
      results: {
        verdict: "above_target",
        priority: "volume",
        realMarginBasisPoints: 3867,
        unitProfitCents: 5800,
      },
    });
    expect(productionSnapshot).toMatchObject({
      schemaVersion: 1,
      calculationVersion: 1,
      contentVersion: 2,
      results: {
        verdict: "above_target",
        priority: "volume",
        realMarginBasisPoints: 3867,
        unitProfitCents: 5800,
      },
    });
    expect(product?.rpc.functionName).toBe(
      "public.create_product_diagnosis_report",
    );
    expect(production?.rpc.functionName).toBe(
      "public.create_production_diagnosis_report",
    );
  });

  it("completes the 36-report administrator matrix", () => {
    expect(currentReportTemplates).toHaveLength(34);
    expect(allAdminReportTemplates).toHaveLength(36);
    expect(
      new Set(allAdminReportTemplates.map((template) => template.key)).size,
    ).toBe(36);
  });
});
