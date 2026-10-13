import { describe, expect, it } from "vitest";

import { buildSeedReportIds, currentReportTemplates } from "./report-scenarios";

const objectiveVerdicts = [
  "direct_loss",
  "incomplete_volume",
  "no_sales",
  "operational_loss",
  "break_even",
  "positive_result",
] as const;

const expected = [
  ...[
    "missing_price",
    "direct_loss",
    "operational_loss",
    "break_even",
    "positive_result",
  ].map((verdict) => ["service", "quick", verdict]),
  ...objectiveVerdicts.map((verdict) => ["product", "quick", verdict]),
  ...objectiveVerdicts.map((verdict) => ["production", "quick", verdict]),
  ...objectiveVerdicts.map((verdict) => ["product", "detailed", verdict]),
  ...objectiveVerdicts.map((verdict) => ["production", "detailed", verdict]),
];

function argumentValue(
  report: ReturnType<(typeof currentReportTemplates)[number]["materialize"]>,
  name: string,
): unknown {
  return report.rpc.arguments.find((argument) => argument.name === name)?.value;
}

describe("current report scenario catalog", () => {
  it("contains the exact 29 objective category/verdict combinations", () => {
    expect(
      currentReportTemplates.map((item) => [
        item.category,
        item.analysisMode,
        item.expectedVerdict,
      ]),
    ).toEqual(expected);
    expect(new Set(currentReportTemplates.map((item) => item.key)).size).toBe(
      29,
    );
  });

  it("materializes every scenario through current calculators and parsers", () => {
    const reports = currentReportTemplates.map((template, index) =>
      template.materialize(buildSeedReportIds(0, index)),
    );

    reports.forEach((report, index) => {
      expect(report.templateKey).toBe(currentReportTemplates[index]?.key);
      expect(report.verdict).toBe(
        currentReportTemplates[index]?.expectedVerdict,
      );
      expect(report.submissionId).toBe(
        buildSeedReportIds(0, index).submissionId,
      );
      const snapshot = argumentValue(report, "p_report_snapshot");
      expect(snapshot).toBeTruthy();
      expect(JSON.stringify(snapshot)).not.toMatch(
        /targetMarginBasisPoints|attentionBandBasisPoints|targetPriceCents|priceReferencesPartial/,
      );
    });
    expect(new Set(reports.map((report) => report.submissionId)).size).toBe(29);
  });

  it("uses the planned detailed item counts", () => {
    const detailed = currentReportTemplates
      .filter((template) => template.analysisMode === "detailed")
      .map((template, index) =>
        template.materialize(buildSeedReportIds(7, index)),
      );
    const snapshots = detailed.map(
      (report) =>
        argumentValue(report, "p_report_snapshot") as {
          inputs: { items: unknown[] };
        },
    );

    expect(
      snapshots.slice(0, 6).map((snapshot) => snapshot.inputs.items.length),
    ).toEqual([1, 2, 3, 5, 8, 10]);
    expect(
      snapshots.slice(6).map((snapshot) => snapshot.inputs.items.length),
    ).toEqual([10, 8, 5, 3, 2, 1]);
  });

  it("includes summarized, technical-sheet, and mixed Production reports", () => {
    const productionSnapshots = currentReportTemplates
      .filter(
        (template) =>
          template.category === "production" &&
          template.analysisMode === "detailed",
      )
      .map(
        (template, index) =>
          argumentValue(
            template.materialize(buildSeedReportIds(8, index)),
            "p_report_snapshot",
          ) as {
            inputs: {
              items: Array<{
                costMode: "summarized" | "technical_sheet";
                ingredients?: unknown[];
              }>;
            };
          },
      );
    const modes = productionSnapshots.flatMap((snapshot) =>
      snapshot.inputs.items.map((item) => item.costMode),
    );

    expect(modes).toContain("summarized");
    expect(modes).toContain("technical_sheet");
    expect(
      productionSnapshots.some(
        (snapshot) =>
          new Set(snapshot.inputs.items.map((item) => item.costMode)).size > 1,
      ),
    ).toBe(true);
    productionSnapshots
      .flatMap((snapshot) => snapshot.inputs.items)
      .filter((item) => item.costMode === "technical_sheet")
      .forEach((item) => expect(item.ingredients).toHaveLength(2));
  });
});
