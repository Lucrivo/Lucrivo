import { describe, expect, it } from "vitest";

import { isDetailedReportSnapshot } from "../schemas/report-snapshot.schema";
import { toEditableReportDraft } from "./report-editor.adapters";
import { snapshots, submissionId } from "./report-editor.adapters.test";
import { buildDetailedEditorItemSummary } from "./detailed-editor-summary";

function detailedFixture() {
  const snapshot = snapshots()[3];
  if (!snapshot || !isDetailedReportSnapshot(snapshot))
    throw new Error("expected detailed snapshot");
  const draft = toEditableReportDraft(snapshot, () => submissionId);
  if (!draft || draft.kind !== "detailed")
    throw new Error("expected detailed draft");
  return { snapshot, item: draft.values.items[0]! };
}

describe("buildDetailedEditorItemSummary", () => {
  it("uses the supplied preview for the item numbers", () => {
    const { snapshot, item } = detailedFixture();

    expect(buildDetailedEditorItemSummary(item, 0, snapshot, {})).toEqual({
      name: "Produto A",
      priceLabel: "R$ 30,00",
      costLabel: "R$ 12,50",
      status: { label: "Deixa valor por venda", tone: "positive" },
      pendingCount: 0,
    });
  });

  it("prioritizes current field errors and counts unique paths", () => {
    const { snapshot, item } = detailedFixture();

    expect(
      buildDetailedEditorItemSummary(item, 0, snapshot, {
        "items.0.unitSalePrice": ["Inválido"],
        "items.0.purchaseUnitCost": ["Obrigatório"],
        fixedMonthlyExpenses: ["Inválido"],
      }),
    ).toMatchObject({
      status: { label: "Revise os campos", tone: "warning" },
      pendingCount: 2,
    });
  });

  it("marks direct loss from the supplied result", () => {
    const { snapshot, item } = detailedFixture();
    const lossSnapshot = {
      ...snapshot,
      results: {
        ...snapshot.results,
        items: snapshot.results.items.map((result) => ({
          ...result,
          directLoss: true,
        })),
      },
    };

    expect(
      buildDetailedEditorItemSummary(item, 0, lossSnapshot, {}).status,
    ).toEqual({
      label: "Perda por venda",
      tone: "critical",
    });
  });
});
