import { describe, expect, it } from "vitest";

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

  it("maps validation issues to field paths", () => {
    const draft = toEditableReportDraft(snapshots()[1]!, () => submissionId)!;
    if (draft.kind !== "product") throw new Error("unexpected draft");

    const result = calculateReportPreview({
      ...draft,
      values: { ...draft.values, unitSalePrice: "" },
    });

    expect(result).toMatchObject({
      status: "invalid",
      fieldErrors: { unitSalePrice: expect.any(Array) },
    });
  });

  it("keeps an invalid detailed draft intact and maps its nested field", () => {
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
