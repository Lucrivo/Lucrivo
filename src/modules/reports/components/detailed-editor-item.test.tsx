import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { isDetailedReportSnapshot } from "../schemas/report-snapshot.schema";
import { toEditableReportDraft } from "../editor/report-editor.adapters";
import type { EditableReportDraft } from "../editor/report-editor.types";
import { snapshots, submissionId } from "../editor/report-editor.adapters.test";
import { DetailedReportEditorFields } from "./detailed-report-editor-fields";

function fixture() {
  const snapshot = snapshots()[3];
  if (!snapshot || !isDetailedReportSnapshot(snapshot))
    throw new Error("expected detailed snapshot");
  const draft = toEditableReportDraft(snapshot, () => submissionId);
  if (!draft || draft.kind !== "detailed")
    throw new Error("expected detailed draft");
  return { snapshot, draft };
}

function Harness({
  initialDraft,
  errors = {},
  revealErrorsSignal = 0,
}: {
  initialDraft: Extract<EditableReportDraft, { kind: "detailed" }>;
  errors?: Record<string, string[]>;
  revealErrorsSignal?: number;
}) {
  const { snapshot } = fixture();
  const [draft, setDraft] = useState(initialDraft);
  return (
    <DetailedReportEditorFields
      draft={draft}
      errors={errors}
      previewSnapshot={snapshot}
      revealErrorsSignal={revealErrorsSignal}
      onChange={setDraft}
    />
  );
}

describe("DetailedReportEditorFields", () => {
  it("starts every item collapsed and allows several items open", async () => {
    const user = userEvent.setup();
    const { draft } = fixture();
    const first = draft.values.items[0]!;
    const withTwo = {
      ...draft,
      values: {
        ...draft.values,
        items: [
          first,
          {
            ...first,
            id: "33333333-3333-4333-8333-333333333333",
            name: "Produto B",
          },
        ],
      },
    };
    render(<Harness initialDraft={withTwo} />);

    expect(
      screen.queryByLabelText("Preço de venda (R$)"),
    ).not.toBeInTheDocument();
    const firstTrigger = screen.getByRole("button", {
      name: "Abrir Produto A",
    });
    const secondTrigger = screen.getByRole("button", {
      name: "Abrir Produto B",
    });
    expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "false");

    await user.click(firstTrigger);
    await user.click(secondTrigger);
    expect(screen.getAllByLabelText("Preço de venda (R$)")).toHaveLength(2);
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
  });

  it("opens and focuses the first invalid item after a save attempt", async () => {
    const { draft } = fixture();
    render(
      <Harness
        initialDraft={draft}
        errors={{ "items.0.unitSalePrice": ["Informe um preço válido."] }}
        revealErrorsSignal={1}
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Preço de venda (R$)")).toHaveFocus(),
    );
  });

  it("opens a newly added item without expanding existing items", async () => {
    const user = userEvent.setup();
    const { draft } = fixture();
    render(<Harness initialDraft={draft} />);

    await user.click(screen.getByRole("button", { name: "Adicionar item" }));

    expect(
      screen.getByRole("button", { name: "Abrir Produto A" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: "Abrir Item 2" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
