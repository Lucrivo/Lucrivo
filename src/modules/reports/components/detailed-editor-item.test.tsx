import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Accordion } from "@/components/ui/accordion";
import type { DetailedProductionItemInput } from "@/modules/detailed-diagnosis/types";

import { isDetailedReportSnapshot } from "../schemas/report-snapshot.schema";
import { toEditableReportDraft } from "../editor/report-editor.adapters";
import type { EditableReportDraft } from "../editor/report-editor.types";
import { snapshots, submissionId } from "../editor/report-editor.adapters.test";
import { DetailedReportEditorFields } from "./detailed-report-editor-fields";
import { DetailedEditorItem } from "./detailed-editor-item";

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
  it("uses the same business labels and help as the detailed wizard", async () => {
    const user = userEvent.setup();
    const { draft } = fixture();
    render(<Harness initialDraft={draft} />);

    expect(screen.getByLabelText("Gastos que existem todo mês")).toBeVisible();
    expect(
      screen.getByRole("switch", {
        name: "Você quer incluir o valor que recebe pelo seu trabalho?",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByLabelText("Qual porcentagem da venda vai para impostos?"),
    ).toBeVisible();
    expect(
      screen.getByLabelText(
        "Qual porcentagem fica com o cartão ou a plataforma?",
      ),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "O que incluir?" }));
    expect(
      screen.getByText(/aluguel, energia, internet, sistemas/i),
    ).toBeVisible();
    await user.click(
      screen.getByRole("switch", {
        name: "Você quer incluir o valor que recebe pelo seu trabalho?",
      }),
    );
    expect(
      screen.getByLabelText("Quanto você quer receber por mês?"),
    ).toBeVisible();
  });

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
      screen.queryByLabelText("Por quanto você vende cada unidade?"),
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
    expect(
      screen.getAllByLabelText("Por quanto você vende cada unidade?"),
    ).toHaveLength(2);
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
      expect(
        screen.getByLabelText("Por quanto você vende cada unidade?"),
      ).toHaveFocus(),
    );
  });

  it("uses the shared price, resale cost, and optional volume copy", async () => {
    const user = userEvent.setup();
    const { draft } = fixture();
    render(<Harness initialDraft={draft} />);

    await user.click(screen.getByRole("button", { name: "Abrir Produto A" }));

    expect(
      screen.getByLabelText("Por quanto você vende cada unidade?"),
    ).toBeVisible();
    expect(
      screen.getByLabelText("Quanto você paga ao fornecedor por unidade?"),
    ).toBeVisible();
    expect(
      screen.getByLabelText("Quantas unidades você vende por mês?"),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Digite 0 se não vendeu nenhuma unidade[\s\S]*deixe em branco[\s\S]*resultado será parcial/i,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Opcional. Deixe em branco se o produto não tiver custo direto.",
      ),
    ).toBeVisible();
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

  it("uses the shared production cost field for a summarized item", () => {
    const item: DetailedProductionItemInput = {
      id: "44444444-4444-4444-8444-444444444444",
      kind: "manufacturing",
      name: "Bolo",
      unitSalePrice: "50",
      monthlySalesVolume: "10",
      costMode: "summarized",
      productionUnitCost: "20",
      recipeYield: "",
      lossRate: "",
      packagingUnitCost: "",
      directLaborUnitCost: "",
      otherVariableUnitCost: "",
      ingredients: [],
    };
    render(
      <Accordion multiple defaultValue={[item.id]}>
        <DetailedEditorItem
          item={item}
          index={0}
          errors={{}}
          summary={{
            name: "Bolo",
            priceLabel: "R$ 50,00",
            costLabel: "R$ 20,00",
            status: { label: "Deixa valor por venda", tone: "positive" },
            pendingCount: 0,
          }}
          canRemove={false}
          onChange={() => undefined}
          onRemove={() => undefined}
        />
      </Accordion>,
    );

    expect(
      screen.getByLabelText("Quanto custa produzir uma unidade?"),
    ).toBeVisible();
  });
});
