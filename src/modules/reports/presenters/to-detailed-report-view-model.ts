import type { PlainLanguageHelpContent } from "@/components/shared/plain-language-help";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
  formatReportDate,
} from "../formatters";
import type { CurrentDetailedReportSnapshot } from "../types";

type DetailedTone = "neutral" | "positive" | "warning" | "critical";

type DetailedMetricViewModel = {
  key: "revenue" | "monthly_result" | "break_even_revenue";
  label: string;
  valueLabel: string;
  unavailableReason?: string;
  tone: DetailedTone;
  help?: PlainLanguageHelpContent;
};

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
  name: string;
  volumeLabel: string;
  statusLabel: string;
  statusTone: "positive" | "critical";
  priceLabel: string;
  costLabel: string;
  surplusLabel: string;
  marginLabel: string;
  breakEvenLabel: string;
  breakEvenUnavailableReason?: string;
  promotionFloorLabel: string;
  promotionFloorUnavailableReason?: string;
  technicalDetails: DetailedTechnicalDetailsViewModel | null;
  rawValues: {
    unitSalePriceCents: number;
    variableUnitCostCents: number;
  };
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
  conclusion: {
    title: string;
    description: string;
    completenessLabel: "Análise completa" | "Análise parcial";
    tone: DetailedTone;
  };
  priority: { title: string; body: string; tone: DetailedTone };
  metrics: DetailedMetricViewModel[];
  comparison: DetailedComparisonEntryViewModel[];
  items: DetailedItemViewModel[];
  secondaryGuidance: Array<{
    key: string;
    title: string;
    body: string;
    tone: DetailedTone;
  }>;
};

const verdictPresentation: Record<
  CurrentDetailedReportSnapshot["results"]["verdict"],
  { title: string; description: string; tone: DetailedTone }
> = {
  direct_loss: {
    title: "Há itens que perdem dinheiro a cada venda",
    description:
      "Corrija primeiro os preços ou custos desses itens antes de buscar mais vendas.",
    tone: "critical",
  },
  incomplete_volume: {
    title: "Faltam vendas mensais para concluir a análise",
    description:
      "Os valores por item já ajudam na decisão, mas o resultado do mês depende dos volumes que faltam.",
    tone: "neutral",
  },
  no_sales: {
    title: "As vendas informadas ainda não cobrem o mês",
    description:
      "Sem vendas, os gastos mensais continuam sem cobertura. Use a meta abaixo para planejar o próximo passo.",
    tone: "warning",
  },
  operational_loss: {
    title: "O mix ainda não cobre os gastos do mês",
    description:
      "O valor deixado pelas vendas é menor que os gastos mensais informados.",
    tone: "critical",
  },
  break_even: {
    title: "O negócio está cobrindo os gastos, sem folga",
    description:
      "O resultado chegou ao ponto de equilíbrio e ainda não formou uma margem para imprevistos ou crescimento.",
    tone: "warning",
  },
  tight_margin: {
    title: "O mix cobre os gastos, mas com pouca folga",
    description:
      "O mês fecha positivo, porém pequenas mudanças em custos ou vendas podem consumir o resultado.",
    tone: "warning",
  },
  adequate_margin: {
    title: "O mix cobre os gastos com folga",
    description:
      "As vendas informadas pagam os custos e gastos mensais e ainda deixam um resultado saudável.",
    tone: "positive",
  },
};

const surplusHelp: PlainLanguageHelpContent = {
  title: "O que sobra por venda?",
  description:
    "É o valor que resta depois do custo do item e das taxas. Ele ajuda a pagar os gastos do mês.",
  technicalTerm: "contribuição unitária",
};

const breakEvenHelp: PlainLanguageHelpContent = {
  title: "Quanto precisa entrar para cobrir os gastos?",
  description:
    "É a estimativa de faturamento mensal necessária para que o valor deixado pelas vendas pague os gastos do mês.",
  technicalTerm: "faturamento de equilíbrio",
};

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
  const verdict = verdictPresentation[snapshot.results.verdict];
  const inputById = new Map(
    snapshot.inputs.items.map((item) => [item.id, item]),
  );
  const resultById = new Map(
    snapshot.results.items.map((result) => [result.itemId, result]),
  );
  const reason = unavailableReason(snapshot);
  const primaryGuidance =
    snapshot.guidance.find((entry) => entry.key === "direct_loss") ??
    snapshot.guidance.find((entry) => entry.key === "missing_volume") ??
    snapshot.guidance.find((entry) => entry.key !== "business_result") ??
    snapshot.guidance[0];
  const priority = primaryGuidance
    ? {
        title: primaryGuidance.title,
        body: primaryGuidance.body,
        tone: primaryGuidance.tone,
      }
    : {
        title: "Acompanhe preços, custos e vendas",
        body: "Atualize o diagnóstico quando houver mudanças relevantes no seu mix.",
        tone: "neutral" as const,
      };

  const metrics: DetailedMetricViewModel[] = [
    {
      key: "revenue",
      label: "Quanto entrou com as vendas",
      valueLabel:
        snapshot.results.monthlyGrossRevenueCents === null
          ? "Ainda não calculado"
          : formatCurrency(snapshot.results.monthlyGrossRevenueCents),
      unavailableReason:
        snapshot.results.monthlyGrossRevenueCents === null ? reason : undefined,
      tone: "neutral",
    },
    {
      key: "monthly_result",
      label: "Quanto sobrou ou faltou no mês",
      valueLabel:
        snapshot.results.monthlyResultCents === null
          ? "Ainda não calculado"
          : formatCurrency(snapshot.results.monthlyResultCents),
      unavailableReason:
        snapshot.results.monthlyResultCents === null ? reason : undefined,
      tone:
        snapshot.results.monthlyResultCents === null
          ? "neutral"
          : snapshot.results.monthlyResultCents < 0
            ? "critical"
            : "positive",
    },
    {
      key: "break_even_revenue",
      label: "Quanto precisa vender para cobrir os gastos",
      valueLabel:
        snapshot.results.breakEvenRevenueCents === null
          ? "Ainda não calculado"
          : formatCurrency(snapshot.results.breakEvenRevenueCents),
      unavailableReason:
        snapshot.results.breakEvenRevenueCents === null ? reason : undefined,
      tone: "neutral",
      help: breakEvenHelp,
    },
  ];

  const items: DetailedItemViewModel[] = snapshot.inputs.items.flatMap(
    (item) => {
      const result = resultById.get(item.id);
      if (!result) return [];
      const rateReason = "As taxas informadas impedem este cálculo.";
      return [
        {
          id: item.id,
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
          costLabel: formatCurrency(result.variableUnitCostCents),
          surplusLabel: formatCurrency(result.unitContributionCents),
          marginLabel:
            result.contributionMarginBasisPoints === null
              ? "Ainda não calculada"
              : formatBasisPoints(result.contributionMarginBasisPoints),
          breakEvenLabel:
            result.breakEvenUnitPriceCents === null
              ? "Ainda não calculado"
              : formatCurrency(result.breakEvenUnitPriceCents),
          breakEvenUnavailableReason:
            result.breakEvenUnitPriceCents === null ? rateReason : undefined,
          promotionFloorLabel:
            result.promotionFloorCents === null
              ? "Ainda não calculado"
              : formatCurrency(result.promotionFloorCents),
          promotionFloorUnavailableReason:
            result.promotionFloorCents === null ? rateReason : undefined,
          technicalDetails: technicalDetails(item),
          rawValues: {
            unitSalePriceCents: item.unitSalePriceCents,
            variableUnitCostCents: result.variableUnitCostCents,
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
    conclusion: {
      ...verdict,
      completenessLabel: snapshot.results.isPartial
        ? "Análise parcial"
        : "Análise completa",
    },
    priority,
    metrics,
    comparison,
    items,
    secondaryGuidance: snapshot.guidance
      .filter(
        (entry) => entry !== primaryGuidance && entry.key !== "business_result",
      )
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
  type DetailedMetricViewModel,
  type DetailedReportViewModel,
  type DetailedTechnicalDetailsViewModel,
};
