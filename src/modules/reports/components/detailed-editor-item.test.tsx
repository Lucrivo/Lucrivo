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

function digitalFixture() {
  const snapshot = snapshots()[4];
  if (!snapshot || !isDetailedReportSnapshot(snapshot))
    throw new Error("expected Digital detailed snapshot");
  const draft = toEditableReportDraft(snapshot, () => submissionId);
  if (!draft || draft.kind !== "detailed")
    throw new Error("expected Digital detailed draft");
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

  it("keeps a Digital scenario fixed and gives new items Digital fields", async () => {
    const user = userEvent.setup();
    const { snapshot, draft: initialDraft } = digitalFixture();

    function DigitalHarness() {
      const [draft, setDraft] = useState(initialDraft);
      return (
        <DetailedReportEditorFields
          draft={draft}
          errors={{}}
          previewSnapshot={snapshot}
          revealErrorsSignal={0}
          onChange={setDraft}
        />
      );
    }

    render(<DigitalHarness />);
    expect(
      screen.queryByRole("radiogroup", { name: "Tipo de produto" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Adicionar item" }));

    expect(
      screen.getByLabelText("Existe algum gasto a cada venda?"),
    ).toBeVisible();
    expect(screen.queryByText(/fornecedor|embalagem/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/ficha técnica|fabricação/i),
    ).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Remover Bolo" })).toBeDisabled();
    expect(
      screen.getByRole("group", {
        name: "Remover Bolo. Mantenha pelo menos um item no diagnóstico.",
      }),
    ).toBeInTheDocument();
  });
  it("uses explicit summary slots and exposes a long name in a tooltip", async () => {
    const user = userEvent.setup();
    const { draft } = fixture();
    const item = draft.values.items[0]!;
    const longName =
      "Produto artesanal com um nome muito longo para o espaço disponível";
    render(
      <Accordion multiple>
        <DetailedEditorItem
          item={{ ...item, name: longName }}
          index={0}
          errors={{}}
          summary={{
            name: longName,
            priceLabel: "R$ 30,00",
            costLabel: "R$ 12,50",
            status: { label: "Deixa valor por venda", tone: "positive" },
            pendingCount: 0,
          }}
          canRemove
          onChange={() => undefined}
          onRemove={() => undefined}
        />
      </Accordion>,
    );

    const trigger = screen.getByRole("button", { name: "Abrir " + longName });
    const slots = [
      "detailed-editor-item-name",
      "detailed-editor-item-sale",
      "detailed-editor-item-cost",
      "detailed-editor-item-status",
    ];
    expect(
      Array.from(trigger.querySelectorAll("[data-slot]")).map((element) =>
        element.getAttribute("data-slot"),
      ),
    ).toEqual(expect.arrayContaining(slots));
    for (const slot of slots) {
      expect(
        trigger.querySelector('[data-slot="' + slot + '"]'),
      ).not.toBeNull();
    }
    const name = trigger.querySelector<HTMLElement>(
      '[data-slot="detailed-editor-item-name"]',
    );
    expect(name).toHaveClass("truncate");
    expect(
      trigger.contains(
        screen.getByRole("button", { name: "Remover " + longName }),
      ),
    ).toBe(false);

    await user.hover(trigger);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(longName);
  });

  it("preserves ingredients until removal is confirmed", async () => {
    const user = userEvent.setup();
    const initialItem: DetailedProductionItemInput = {
      id: "44444444-4444-4444-8444-444444444444",
      kind: "manufacturing",
      name: "Bolo",
      unitSalePrice: "50",
      monthlySalesVolume: "10",
      costMode: "technical_sheet",
      productionUnitCost: "",
      recipeYield: "10",
      lossRate: "0",
      packagingUnitCost: "1",
      directLaborUnitCost: "2",
      otherVariableUnitCost: "0",
      ingredients: [
        {
          id: "ingredient-1",
          name: "Farinha",
          quantity: "1",
          unit: "kg",
          unitCost: "6",
        },
        {
          id: "ingredient-2",
          name: "Açúcar",
          quantity: "1",
          unit: "kg",
          unitCost: "4",
        },
      ],
    };

    function ProductionItemHarness() {
      const [item, setItem] = useState(initialItem);
      return (
        <Accordion multiple defaultValue={[item.id]}>
          <DetailedEditorItem
            item={item}
            index={0}
            errors={{}}
            summary={{
              name: "Bolo",
              priceLabel: "R$ 50,00",
              costLabel: "R$ 13,00",
              status: { label: "Deixa valor por venda", tone: "positive" },
              pendingCount: 0,
            }}
            canRemove={false}
            onChange={(field, value) =>
              setItem((current) => ({ ...current, [field]: value }))
            }
            onRemove={() => undefined}
          />
        </Accordion>
      );
    }

    render(<ProductionItemHarness />);
    const remove = screen.getByRole("button", { name: "Remover Farinha" });
    await user.click(remove);
    expect(screen.getByText("Farinha")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByText("Farinha")).toBeVisible();

    await user.click(remove);
    await user.click(
      screen.getByRole("button", { name: "Remover ingrediente" }),
    );
    expect(
      screen.queryByRole("button", { name: "Remover Farinha" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Açúcar")).toBeVisible();
  });
});
