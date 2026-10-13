import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { toEditableReportDraft } from "./report-editor.adapters";
import { snapshots, submissionId } from "./report-editor.adapters.test";
import { useReportPreview } from "./use-report-preview";

describe("useReportPreview", () => {
  it("retains the last valid snapshot while the current draft is invalid", () => {
    const snapshot = snapshots()[1]!;
    const draft = toEditableReportDraft(snapshot, () => submissionId)!;
    const { result, rerender } = renderHook(
      ({ currentDraft }) => useReportPreview(currentDraft, snapshot),
      { initialProps: { currentDraft: draft } },
    );

    expect(result.current.status).toBe("valid");
    if (draft.kind !== "product") throw new Error("unexpected draft");

    act(() => {
      rerender({
        currentDraft: {
          ...draft,
          values: { ...draft.values, unitSalePrice: "35" },
        },
      });
    });

    expect(result.current.status).toBe("valid");
    const lastValid = result.current.snapshot;
    expect(lastValid).not.toEqual(snapshot);

    act(() => {
      rerender({
        currentDraft: {
          ...draft,
          values: { ...draft.values, unitSalePrice: "" },
        },
      });
    });

    expect(result.current.status).toBe("invalid");
    expect(result.current.snapshot).toEqual(lastValid);
    expect(result.current.fieldErrors.unitSalePrice).toBeDefined();
  });
});
