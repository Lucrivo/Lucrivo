import type { DetailedDiagnosisInput } from "@/modules/detailed-diagnosis/types";

import { formatCurrency } from "../formatters";
import type { CurrentDetailedReportSnapshot } from "../types";

type DetailedEditorItemSummary = {
  name: string;
  priceLabel: string;
  costLabel: string;
  status: {
    label: "Revise os campos" | "Perda por venda" | "Deixa valor por venda";
    tone: "warning" | "critical" | "positive";
  };
  pendingCount: number;
};

function buildDetailedEditorItemSummary(
  item: DetailedDiagnosisInput["items"][number],
  index: number,
  preview: CurrentDetailedReportSnapshot,
  errors: Record<string, string[]>,
): DetailedEditorItemSummary {
  const errorPrefix = `items.${index}`;
  const pendingCount = Object.keys(errors).filter(
    (path) => path === errorPrefix || path.startsWith(`${errorPrefix}.`),
  ).length;
  const input = preview.inputs.items.find(
    (candidate) => candidate.id === item.id,
  );
  const result = preview.results.items.find(
    (candidate) => candidate.itemId === item.id,
  );
  const priceCents = input?.unitSalePriceCents ?? 0;
  const variableCostCents = result?.variableUnitCostCents ?? 0;

  return {
    name: item.name.trim() || `Item ${index + 1}`,
    priceLabel: formatCurrency(priceCents),
    costLabel: formatCurrency(variableCostCents),
    status:
      pendingCount > 0
        ? { label: "Revise os campos", tone: "warning" }
        : result?.directLoss
          ? { label: "Perda por venda", tone: "critical" }
          : { label: "Deixa valor por venda", tone: "positive" },
    pendingCount,
  };
}

export { buildDetailedEditorItemSummary, type DetailedEditorItemSummary };
