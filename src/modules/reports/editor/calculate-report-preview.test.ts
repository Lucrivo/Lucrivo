import { describe, expect, it } from "vitest";

import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateDetailedSalesGoal } from "../domain/calculate-detailed-sales-goal";
import { productDiagnosisSchema } from "@/modules/quick-diagnosis/schemas/product-diagnosis.schema";
import { calculateReportPreview } from "./calculate-report-preview";
import { toEditableReportDraft } from "./report-editor.adapters";
import { snapshots, submissionId } from "./report-editor.adapters.test";

describe("calculateReportPreview", () => {
  it("reproduces the canonical snapshot for every editable report kind", () => {
    for (const snapshot of snapshots()) {
      const draft = toEditableReportDraft(snapshot, () => submissionId);
      expect(draft).not.toBeNull();
      expect(calculateReportPreview(draft!)).toEqual({
        status: "valid",
        snapshot,
      });
    }
  });

  it("clears and restores every complete Product value with volume", () => {
    const draft = toEditableReportDraft(snapshots()[1]!, () => submissionId)!;
    if (draft.kind !== "product") throw new Error("unexpected draft");

    const completeDraft = {
      ...draft,
      values: { ...draft.values, monthlySalesVolume: "100" },
    };
    const complete = calculateReportPreview(completeDraft);
    if (
      complete.status !== "valid" ||
      complete.snapshot.category !== "product" ||
      "analysisMode" in complete.snapshot
    ) {
      throw new Error("expected complete Product preview");
    }
    const expected = calculateProductReport(
      productDiagnosisSchema.parse(completeDraft.values),
    );
    expect(complete.snapshot.results).toMatchObject({
      fixedAllocationCents: expected.fixedAllocationCents,
      totalUnitCostCents: expected.totalUnitCostCents,
      minimumPriceCents: expected.minimumPriceCents,
      unitProfitCents: expected.unitProfitCents,
      realMarginBasisPoints: expected.realMarginBasisPoints,
    });
    expect(complete.snapshot.results.fixedAllocationCents).not.toBeNull();

    const partial = calculateReportPreview({
      ...completeDraft,
      values: { ...completeDraft.values, monthlySalesVolume: "" },
    });
    if (
      partial.status !== "valid" ||
      partial.snapshot.category !== "product" ||
      "analysisMode" in partial.snapshot
    ) {
      throw new Error("expected partial Product preview");
    }
    expect(partial.snapshot.results).toMatchObject({
      fixedAllocationCents: null,
      totalUnitCostCents: null,
      minimumPriceCents: null,
      unitProfitCents: null,
      realMarginBasisPoints: null,
    });
  });

  it("keeps a single-item detailed sales goal available without volume", () => {
    const draft = toEditableReportDraft(snapshots()[3]!, () => submissionId)!;
    if (draft.kind !== "detailed") throw new Error("unexpected draft");
    const result = calculateReportPreview(draft);
    if (result.status !== "valid" || !("analysisMode" in result.snapshot)) {
      throw new Error("expected detailed preview");
    }

    expect(
      calculateDetailedSalesGoal(
        result.snapshot.inputs,
        result.snapshot.results,
        result.snapshot.policy,
      ),
    ).toMatchObject({
      available: true,
      monthly: expect.any(Number),
      weekly: null,
      daily: null,
      basedOnKnownMix: false,
    });
  });

  it("maps validation issues to field paths without mutating the draft", () => {
    const draft = toEditableReportDraft(snapshots()[3]!, () => submissionId)!;
    if (draft.kind !== "detailed") throw new Error("unexpected draft");
    const invalidDraft = {
      ...draft,
      values: {
        ...draft.values,
        items: [
          { ...draft.values.items[0]!, unitSalePrice: "" },
          ...draft.values.items.slice(1),
        ],
      },
    };
    const before = structuredClone(invalidDraft);

    expect(calculateReportPreview(invalidDraft)).toMatchObject({
      status: "invalid",
      fieldErrors: { "items.0.unitSalePrice": expect.any(Array) },
    });
    expect(invalidDraft).toEqual(before);
  });
});
