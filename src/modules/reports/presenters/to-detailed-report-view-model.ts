import type { PlainLanguageHelpContent } from "@/components/shared/plain-language-help";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
  formatReportDate,
} from "../formatters";
import type {
  CurrentDetailedReportSnapshot,
  ReportDiscountSimulationBase,
} from "../types";
import { getReportLanguageProfile } from "./report-language";
import type {
  ReportExecutiveSummaryViewModel,
  ReportNumberViewModel,
  ReportSectionViewModel,
} from "./to-report-view-model";

type DetailedTone = "neutral" | "positive" | "warning" | "critical";

type DetailedTechnicalDetailsViewModel = {
  modeLabel: "Custo total informado" | "Ficha técnica completa";
  yieldAndLossLabel?: string;
  ingredients: Array<{
    id: string;
    name: string;
    quantityLabel: string;
    unitCostLabel: string;
  }>;
  additionalCostsLabel?: string;
};

type DetailedItemViewModel = {
  id: string;
  category: "product" | "production";
  name: string;
  volumeLabel: string;
  statusLabel: string;
  statusTone: "positive" | "critical";
  priceLabel: string;
  variableCostLabel: string;
  feeLabel: string;
  netRevenueLabel: string;
  unitContributionLabel: string;
  monthlyContributionLabel: string;
  marginLabel: string;
  breakEvenLabel: string;
  breakEvenUnavailableReason?: string;
  technicalDetails: DetailedTechnicalDetailsViewModel | null;
  discountSimulationBase: ReportDiscountSimulationBase;
};

type DetailedComparisonEntryViewModel = {
  id: string;
  name: string;
  amountCents: number;
  amountLabel: string;
  contextLabel: "por unidade" | "no mês";
  statusLabel: string;
  tone: "positive" | "critical";
};

type DetailedReportViewModel = {
  identity: {
    title: string;
    categoryLabel: string;
    createdAtLabel: string;
    reportLabel: string;
  };
  executiveSummary: ReportExecutiveSummaryViewModel;
  numbers: ReportNumberViewModel[];
  sections: ReportSectionViewModel[];
  comparison: DetailedComparisonEntryViewModel[];
  items: DetailedItemViewModel[];
  secondaryGuidance: Array<{
    key: string;
    title: string;
    body: string;
    tone: DetailedTone;
  }>;
};

const breakEvenHelp: PlainLanguageHelpContent = {
  title: "Quanto precisa entrar para cobrir os gastos?",
  description:
    "É a estimativa de faturamento mensal necessária para que o valor deixado pelas vendas pague os gastos do mês.",
  technicalTerm: "faturamento de equilíbrio",
};

const marginHelp: PlainLanguageHelpContent = {
  title: "Quanto sobra a cada R$ 100?",
  description:
    "Mostra quanto fica no negócio depois dos custos dos itens, impostos, cartão e gastos mensais usados neste diagnóstico.",
  technicalTerm: "margem",
};

const surplusHelp: PlainLanguageHelpContent = {
  title: "O que sobra por venda?",
  description:
    "É o valor que resta depois do custo do item e das taxas. Ele ajuda a pagar os gastos do mês.",
  technicalTerm: "contribuição unitária",
};

function optionalCurrency(value: number | null): string {
  return value === null ? "Ainda não calculado" : formatCurrency(value);
}

function optionalPercentage(value: number | null): string {
  return value === null ? "Ainda não calculado" : formatBasisPoints(value);
}

function unavailableReason(snapshot: CurrentDetailedReportSnapshot): string {
  return snapshot.results.isPartial
    ? "Informe as vendas mensais para calcular."
    : "As taxas informadas impedem este cálculo.";
}

function technicalDetails(
  item: CurrentDetailedReportSnapshot["inputs"]["items"][number],
): DetailedTechnicalDetailsViewModel | null {
  if (item.kind !== "manufacturing") return null;
  if (item.costMode === "summarized") {
    return {
      modeLabel: "Custo total informado",
      ingredients: [],
      additionalCostsLabel: `${formatCurrency(item.productionUnitCostCents)} por unidade`,
    };
  }
  return {
    modeLabel: "Ficha técnica completa",
    yieldAndLossLabel: `${formatIntegerVolume(item.recipeYield)} unidades por receita · ${formatBasisPoints(item.lossRateBasisPoints)} de perda`,
    ingredients: item.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      quantityLabel: `${ingredient.quantityMillionths / 1_000_000} ${ingredient.unit}`,
      unitCostLabel: formatCurrency(
        Math.round(ingredient.unitCostTenThousandths / 100),
      ),
    })),
    additionalCostsLabel: `Embalagem ${formatCurrency(item.packagingUnitCostCents)} · mão de obra ${formatCurrency(item.directLaborUnitCostCents)} · outros custos ${formatCurrency(item.otherVariableUnitCostCents)}`,
  };
}

function toDetailedReportViewModel({
  id,
  createdAt,
  snapshot,
}: {
  id: number;
  createdAt: string;
  snapshot: CurrentDetailedReportSnapshot;
}): DetailedReportViewModel {
  const language = getReportLanguageProfile(snapshot);
  const inputById = new Map(
    snapshot.inputs.items.map((item) => [item.id, item]),
  );
  const resultById = new Map(
    snapshot.results.items.map((result) => [result.itemId, result]),
  );
  const reason = unavailableReason(snapshot);
  const totalFeeBasisPoints =
    snapshot.inputs.taxRateBasisPoints + snapshot.inputs.cardFeeRateBasisPoints;

  const number = (
    key: ReportNumberViewModel["key"],
    label: string,
    value: string,
    help?: PlainLanguageHelpContent,
  ): ReportNumberViewModel => ({
    key,
    label,
    value,
    ...(value === "Ainda não calculado" ? { supportingText: reason } : {}),
    ...(help ? { help } : {}),
  });

  const numbers: ReportNumberViewModel[] = [
    number(
      "revenue",
      "Quanto entrou com as vendas",
      optionalCurrency(snapshot.results.monthlyGrossRevenueCents),
    ),
    number(
      "costs",
      "Custos do mês",
      optionalCurrency(snapshot.results.monthlyCostCents),
    ),
    number(
      "result",
      "Resultado do mês",
      optionalCurrency(snapshot.results.monthlyResultCents),
    ),
    number(
      "margin",
      "Quanto sobra a cada R$ 100",
      optionalPercentage(snapshot.results.finalMarginBasisPoints),
      marginHelp,
    ),
    number(
      "break_even",
      "Quanto precisa vender para cobrir os gastos",
      optionalCurrency(snapshot.results.breakEvenRevenueCents),
      breakEvenHelp,
    ),
  ];

  const items: DetailedItemViewModel[] = snapshot.inputs.items.flatMap(
    (item) => {
      const result = resultById.get(item.id);
      if (!result) return [];
      return [
        {
          id: item.id,
          category: snapshot.category,
          name: item.name,
          volumeLabel:
            item.monthlySalesVolume === null
              ? "Vendas mensais ainda não informadas"
              : `${formatIntegerVolume(item.monthlySalesVolume)} unidades vendidas no mês`,
          statusLabel: result.directLoss
            ? "Perda por venda"
            : "Deixa valor por venda",
          statusTone: result.directLoss ? "critical" : "positive",
          priceLabel: formatCurrency(item.unitSalePriceCents),
          variableCostLabel: formatCurrency(result.variableUnitCostCents),
          feeLabel: formatCurrency(result.feeAmountCents),
          netRevenueLabel: formatCurrency(result.netUnitRevenueCents),
          unitContributionLabel: formatCurrency(result.unitContributionCents),
          monthlyContributionLabel:
            result.monthlyContributionCents === null
              ? "Ainda não calculado"
              : formatCurrency(result.monthlyContributionCents),
          marginLabel:
            result.contributionMarginBasisPoints === null
              ? "Ainda não calculada"
              : formatBasisPoints(result.contributionMarginBasisPoints),
          breakEvenLabel:
            result.breakEvenUnitPriceCents === null
              ? "Ainda não calculado"
              : formatCurrency(result.breakEvenUnitPriceCents),
          breakEvenUnavailableReason:
            result.breakEvenUnitPriceCents === null
              ? "As taxas informadas impedem este cálculo."
              : undefined,
          technicalDetails: technicalDetails(item),
          discountSimulationBase: {
            originalPriceCents: item.unitSalePriceCents,
            unitCostCents: result.variableUnitCostCents,
            totalFeeBasisPoints,
            attentionBandBasisPoints: snapshot.policy.attentionBandBasisPoints,
            minimumPriceCents: result.breakEvenUnitPriceCents,
            partial: true,
          },
        },
      ];
    },
  );

  const comparison = snapshot.results.items
    .flatMap<DetailedComparisonEntryViewModel>((result) => {
      const input = inputById.get(result.itemId);
      if (!input) return [];
      const amountCents = snapshot.results.isPartial
        ? result.unitContributionCents
        : (result.monthlyContributionCents ?? 0);
      return [
        {
          id: result.itemId,
          name: input.name,
          amountCents,
          amountLabel: formatCurrency(amountCents),
          contextLabel: snapshot.results.isPartial ? "por unidade" : "no mês",
          statusLabel:
            amountCents < 0
              ? "Prejudica o resultado"
              : "Ajuda a cobrir os gastos",
          tone: amountCents < 0 ? "critical" : "positive",
        },
      ];
    })
    .sort((left, right) => right.amountCents - left.amountCents);

  return {
    identity: {
      title:
        snapshot.category === "product"
          ? "Resultado dos seus produtos"
          : "Resultado das suas produções",
      categoryLabel: snapshot.category === "product" ? "Produtos" : "Produções",
      createdAtLabel: `Gerado em ${formatReportDate(createdAt)}`,
      reportLabel: `Relatório financeiro #${id}`,
    },
    executiveSummary: {
      ...snapshot.executiveSummary,
      verdict: {
        ...snapshot.executiveSummary.verdict,
        toneLabel: language.toneLabels[snapshot.executiveSummary.verdict.tone],
      },
      facts: snapshot.executiveSummary.facts,
    },
    numbers,
    sections: snapshot.sections.map((section) => ({
      ...section,
      toneLabel: language.toneLabels[section.tone],
    })),
    comparison,
    items,
    secondaryGuidance: snapshot.guidance
      .filter((entry) => entry.key !== "business_result")
      .map((entry) => ({
        key: entry.key,
        title: entry.title,
        body: entry.body,
        tone: entry.tone,
      })),
  };
}

export {
  surplusHelp,
  toDetailedReportViewModel,
  type DetailedComparisonEntryViewModel,
  type DetailedItemViewModel,
  type DetailedReportViewModel,
  type DetailedTechnicalDetailsViewModel,
};
