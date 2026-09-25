import { describe, expect, it } from "vitest";

import { buildSeedReportIds, currentReportTemplates } from "./report-scenarios";

const expected = [
  ["service", "quick", "missing_price"],
  ["service", "quick", "direct_loss"],
  ["service", "quick", "operational_loss"],
  ["service", "quick", "tight_margin"],
  ["service", "quick", "adequate_margin"],
  ["service", "quick", "above_target"],
  ["product", "quick", "direct_loss"],
  ["product", "quick", "incomplete_volume"],
  ["product", "quick", "no_sales"],
  ["product", "quick", "operational_loss"],
  ["product", "quick", "break_even"],
  ["product", "quick", "tight_margin"],
  ["product", "quick", "adequate_margin"],
  ["production", "quick", "direct_loss"],
  ["production", "quick", "incomplete_volume"],
  ["production", "quick", "no_sales"],
  ["production", "quick", "operational_loss"],
  ["production", "quick", "break_even"],
  ["production", "quick", "tight_margin"],
  ["production", "quick", "adequate_margin"],
  ["product", "detailed", "direct_loss"],
  ["product", "detailed", "incomplete_volume"],
  ["product", "detailed", "no_sales"],
  ["product", "detailed", "operational_loss"],
  ["product", "detailed", "break_even"],
  ["product", "detailed", "tight_margin"],
  ["product", "detailed", "adequate_margin"],
  ["production", "detailed", "direct_loss"],
  ["production", "detailed", "incomplete_volume"],
  ["production", "detailed", "no_sales"],
  ["production", "detailed", "operational_loss"],
  ["production", "detailed", "break_even"],
  ["production", "detailed", "tight_margin"],
  ["production", "detailed", "adequate_margin"],
] as const;

function argumentValue(
  report: ReturnType<(typeof currentReportTemplates)[number]["materialize"]>,
  name: string,
): unknown {
  return report.rpc.arguments.find((argument) => argument.name === name)?.value;
}

describe("current report scenario catalog", () => {
  it("contains the exact 34-family/verdict matrix", () => {
    expect(
      currentReportTemplates.map((item) => [
        item.category,
        item.analysisMode,
        item.expectedVerdict,
      ]),
    ).toEqual(expected);
    expect(new Set(currentReportTemplates.map((item) => item.key)).size).toBe(
      34,
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
      expect(argumentValue(report, "p_report_snapshot")).toBeTruthy();
    });
    expect(new Set(reports.map((report) => report.submissionId)).size).toBe(34);
  });

  it("uses the planned detailed item counts and covers every guidance key", () => {
    const detailed = currentReportTemplates
      .filter((template) => template.analysisMode === "detailed")
      .map((template, index) =>
        template.materialize(buildSeedReportIds(7, index)),
      );
    const snapshots = detailed.map(
      (report) =>
        argumentValue(report, "p_report_snapshot") as {
          inputs: { items: unknown[] };
          guidance: Array<{ key: string }>;
        },
    );

    expect(
      snapshots.slice(0, 7).map((snapshot) => snapshot.inputs.items.length),
    ).toEqual([1, 2, 3, 5, 8, 10, 12]);
    expect(
      snapshots.slice(7).map((snapshot) => snapshot.inputs.items.length),
    ).toEqual([12, 10, 8, 5, 3, 2, 1]);
    expect(
      [
        ...new Set(
          snapshots.flatMap((snapshot) =>
            snapshot.guidance.map(({ key }) => key),
          ),
        ),
      ].sort(),
    ).toEqual(
      [
        "missing_volume",
        "direct_loss",
        "concentration",
        "best_unit_contribution",
        "high_volume_low_margin",
        "business_result",
      ].sort(),
    );
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
