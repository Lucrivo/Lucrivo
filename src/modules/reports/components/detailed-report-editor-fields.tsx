"use client";

import { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";

import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { DetailedDiagnosisInput } from "@/modules/detailed-diagnosis/types";

import { buildDetailedEditorItemSummary } from "../editor/detailed-editor-summary";
import type { EditableReportDraft } from "../editor/report-editor.types";
import type { CurrentDetailedReportSnapshot } from "../types";
import { DetailedEditorItem } from "./detailed-editor-item";
import { EditorField } from "./quick-report-editor-fields";

type DetailedDraft = Extract<EditableReportDraft, { kind: "detailed" }>;

function newItem(
  category: DetailedDiagnosisInput["category"],
  id: string,
): DetailedDiagnosisInput["items"][number] {
  const common = {
    id,
    name: "",
    unitSalePrice: "",
    monthlySalesVolume: "",
  };
  return category === "product"
    ? {
        ...common,
        kind: "resale",
        purchaseUnitCost: "",
        packagingUnitCost: "",
      }
    : {
        ...common,
        kind: "manufacturing",
        costMode: "summarized",
        productionUnitCost: "",
        recipeYield: "",
        lossRate: "0",
        packagingUnitCost: "",
        directLaborUnitCost: "",
        otherVariableUnitCost: "",
        ingredients: [],
      };
}

function DetailedReportEditorFields({
  draft,
  errors,
  previewSnapshot,
  revealErrorsSignal,
  onChange,
}: {
  draft: DetailedDraft;
  errors: Record<string, string[]>;
  previewSnapshot: CurrentDetailedReportSnapshot;
  revealErrorsSignal: number;
  onChange: (draft: DetailedDraft) => void;
}) {
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  const values = draft.values;
  const changeValues = (next: DetailedDiagnosisInput) =>
    onChange({ ...draft, values: next });
  const updateRoot = (field: keyof DetailedDiagnosisInput, value: unknown) =>
    changeValues({ ...values, [field]: value } as DetailedDiagnosisInput);
  const updateItem = (index: number, field: string, value: unknown) => {
    const items = values.items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ) as DetailedDiagnosisInput["items"];
    updateRoot("items", items);
  };

  useEffect(() => {
    if (revealErrorsSignal === 0) return;
    const firstItemErrorPath = Object.keys(errors).find((path) =>
      /^items\.\d+(?:\.|$)/.test(path),
    );
    if (!firstItemErrorPath) return;
    const index = Number(/^items\.(\d+)/.exec(firstItemErrorPath)?.[1]);
    const item = values.items[index];
    if (!item) return;
    const frame = requestAnimationFrame(() => {
      setExpandedItemIds((current) =>
        current.includes(item.id) ? current : [...current, item.id],
      );
      requestAnimationFrame(() =>
        document.getElementById(firstItemErrorPath)?.focus(),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [errors, revealErrorsSignal, values.items]);

  function removeItem(index: number) {
    const item = values.items[index];
    if (!item) return;
    setExpandedItemIds((current) =>
      current.filter((itemId) => itemId !== item.id),
    );
    updateRoot(
      "items",
      values.items.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function addItem() {
    const id = crypto.randomUUID();
    updateRoot("items", [...values.items, newItem(values.category, id)]);
    setExpandedItemIds((current) => [...current, id]);
  }

  return (
    <div className="grid gap-6">
      <section className="border-border/70 bg-muted/20 grid gap-4 rounded-xl border p-4 sm:p-5">
        <div>
          <h3 className="font-semibold">Dados do negócio</h3>
          <p className="text-muted-foreground text-sm">
            Estes valores afetam todos os itens desta simulação.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EditorField
            id="fixedMonthlyExpenses"
            label="Gastos fixos mensais (R$)"
            value={values.fixedMonthlyExpenses}
            error={errors.fixedMonthlyExpenses}
            onChange={(value) => updateRoot("fixedMonthlyExpenses", value)}
          />
          <EditorField
            id="proLabore"
            label="Pró-labore mensal (R$)"
            value={values.proLabore}
            error={errors.proLabore}
            onChange={(value) =>
              changeValues({
                ...values,
                proLabore: value,
                proLaboreIncluded: value.trim() !== "",
              })
            }
          />
          <EditorField
            id="taxRate"
            label="Impostos (%)"
            value={values.taxRate}
            error={errors.taxRate}
            onChange={(value) => updateRoot("taxRate", value)}
          />
          <EditorField
            id="cardFeeRate"
            label="Cartão ou plataforma (%)"
            value={values.cardFeeRate}
            error={errors.cardFeeRate}
            onChange={(value) => updateRoot("cardFeeRate", value)}
          />
          <EditorField
            id="promotionMarginRate"
            label="Margem mínima para promoção (%)"
            value={values.promotionMarginRate}
            error={errors.promotionMarginRate}
            onChange={(value) => updateRoot("promotionMarginRate", value)}
          />
        </div>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Itens do diagnóstico</h3>
            <p className="text-muted-foreground text-sm">
              Abra um item para ajustar seus preços, custos e vendas.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={addItem}>
            <PlusIcon aria-hidden="true" />
            Adicionar item
          </Button>
        </div>

        <Accordion
          multiple
          value={expandedItemIds}
          onValueChange={setExpandedItemIds}
          className="grid gap-3"
        >
          {values.items.map((item, index) => (
            <DetailedEditorItem
              key={item.id}
              item={item}
              index={index}
              errors={errors}
              summary={buildDetailedEditorItemSummary(
                item,
                index,
                previewSnapshot,
                errors,
              )}
              canRemove={values.items.length > 1}
              onChange={(field, value) => updateItem(index, field, value)}
              onRemove={() => removeItem(index)}
            />
          ))}
        </Accordion>
      </section>
    </div>
  );
}

export { DetailedReportEditorFields };
