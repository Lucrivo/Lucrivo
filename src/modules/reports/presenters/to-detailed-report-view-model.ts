import type { PlainLanguageHelpContent } from "@/components/shared/plain-language-help";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
  formatReportDate,
  formatReportScenario,
} from "../formatters";
import { calculateDetailedSalesGoal } from "../domain/calculate-detailed-sales-goal";
import {
  deriveDetailedBreakEvenScenario,
  type DetailedBreakEvenScenario,
} from "../domain/detailed-break-even-scenario";
import {
  DETAILED_REPORT_CONTENT_VERSION,
  type CurrentDetailedReportSnapshot,
  type ExecutiveSummaryAnswer,
  type ReportDiscountSimulationBase,
  type ReportTone,
} from "../types";
import {
  getReportLanguageProfile,
  type ReportLanguageProfile,
} from "./report-language";
import { toComfortableReportAnswers } from "./to-comfortable-report-answers";
import type {
  ReportExecutiveSummaryViewModel,
  ReportIndicatorViewModel,
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
  fixedAllocationLabel: string;
  totalUnitCostLabel: string;
  unitProfitLabel: string;
  realMarginLabel: string;
  completeCostUnavailableReason?: string;
  unitContributionLabel: string;
  monthlyContributionLabel: string;
  marginLabel: string;
  breakEvenLabel: string;
  breakEvenUnavailableReason?: string;
  /** Present when the item has no volume: break-even selling only this item. */
  breakEvenReferenceLabel?: string;
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
    scenarioLabel: string;
    createdAtLabel: string;
  };
  executiveSummary: ReportExecutiveSummaryViewModel;
  indicators: ReportIndicatorViewModel[];
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
  triggerLabel: "Como calculamos?",
  title: "Faturamento de equilíbrio",
  description:
    "É quanto precisa entrar no mês para que o valor deixado pelas vendas pague os gastos do mês. Nesse ponto não há lucro nem prejuízo.",
  technicalTerm: "faturamento de equilíbrio",
};

const marginHelp: PlainLanguageHelpContent = {
  triggerLabel: "Entenda esse valor",
  title: "Margem de lucro",
  description:
    "A margem de lucro mostra quanto sobra de cada R$ 100 vendidos depois de pagar tudo: os custos dos itens, impostos, cartão e os gastos do mês. Uma margem de 20% significa que, de cada R$ 100, R$ 20 ficam com você. Se for negativa, você está pagando para vender.",
  technicalTerm: "margem de lucro real",
};

const salesHelp: PlainLanguageHelpContent = {
  triggerLabel: "Como calculamos?",
  title: "Quantidade de equilíbrio",
  description:
    "Dividimos os gastos do mês pelo valor que as vendas deixam depois dos custos dos itens, impostos e cartão. Vendendo essa quantidade você paga tudo; cada venda a mais vira lucro.",
  technicalTerm: "ponto de equilíbrio",
};

const UNAVAILABLE = "Ainda não calculado";

const surplusHelp: PlainLanguageHelpContent = {
  title: "O que cada venda deixa para o mês?",
  description:
    "É o valor que resta depois do custo da unidade e das cobranças da venda. Esse valor ajuda a pagar os gastos mensais.",
  technicalTerm: "contribuição unitária",
};
function detailedAnswerHelp(
  key: ExecutiveSummaryAnswer["key"],
): PlainLanguageHelpContent {
  if (key === "profitability") {
    return {
      triggerLabel: "Como calculamos?",
      title: "Como calculamos o resultado do conjunto",
      description:
        "Somamos o valor deixado pelas vendas de todos os itens e descontamos os gastos mensais uma única vez. Um item com perda continua sendo destacado, mesmo quando os demais compensam essa perda.",
    };
  }
  if (key === "price_sufficiency") {
    return {
      triggerLabel: "O que está incluído?",
      title: "O que os preços precisam pagar",
      description:
        "Os preços completos incluem os custos de cada item, impostos, cartão e a parte dos gastos mensais distribuída conforme as quantidades informadas.",
    };
  }
  return {
    triggerLabel: "Por que este passo?",
    title: "Como escolhemos a prioridade",
    description:
      "Primeiro tratamos itens que perdem dinheiro em cada venda. Depois, quantidades ausentes, prejuízo do conjunto e volume. Assim, aumentar vendas nunca aparece como solução para um item que gera perda.",
  };
}

function toDetailedSummaryAnswers(snapshot: CurrentDetailedReportSnapshot) {
  const answers = toComfortableReportAnswers(snapshot.executiveSummary.answers);
  if (snapshot.contentVersion !== DETAILED_REPORT_CONTENT_VERSION) {
    return answers;
  }
  return answers.map((answer) => ({
    ...answer,
    help: detailedAnswerHelp(answer.key),
  }));
}

function optionalCurrency(value: number | null): string {
  return value === null ? UNAVAILABLE : formatCurrency(value);
}

function optionalPercentage(value: number | null): string {
  return value === null ? UNAVAILABLE : formatBasisPoints(value);
}

function unavailableReason(snapshot: CurrentDetailedReportSnapshot): string {
  return snapshot.results.isPartial
    ? "Depende das quantidades ainda não informadas; veja a referência de equilíbrio de cada item."
    : "As informações atuais não permitem calcular este valor.";
}

function resultTone(result: number | null): ReportTone {
  if (result === null) return "neutral";
  if (result > 0) return "positive";
  if (result < 0) return "critical";
  return "warning";
}

function sectionBody(
  snapshot: CurrentDetailedReportSnapshot,
  key: CurrentDetailedReportSnapshot["sections"][number]["key"],
): string | undefined {
  return snapshot.sections.find((section) => section.key === key)?.body;
}

function toDetailedIndicators(
  snapshot: CurrentDetailedReportSnapshot,
  scenario: DetailedBreakEvenScenario,
  language: ReportLanguageProfile,
): ReportIndicatorViewModel[] {
  const results = snapshot.results;
  const reason = unavailableReason(snapshot);
  const salesGoal = calculateDetailedSalesGoal(
    snapshot.inputs,
    results,
    snapshot.policy,
  );
  const totalVolume = results.isPartial
    ? null
    : snapshot.inputs.items.reduce(
        (sum, item) => sum + (item.monthlySalesVolume ?? 0),
        0,
      );
  const consolidated = scenario.consolidated;

  const salesTone: ReportTone = !salesGoal.available
    ? results.isPartial
      ? "neutral"
      : "critical"
    : totalVolume === null
      ? "neutral"
      : totalVolume >= salesGoal.monthly
        ? "positive"
        : "critical";
  const salesSupporting = salesGoal.available
    ? [
        totalVolume === null
          ? "Referência de equilíbrio"
          : `Você informou ${formatIntegerVolume(totalVolume)} unidades no mês`,
        salesGoal.weekly !== null && salesGoal.daily !== null
          ? `${formatIntegerVolume(salesGoal.weekly)} por semana e ${formatIntegerVolume(salesGoal.daily)} por dia`
          : consolidated
            ? `${formatIntegerVolume(consolidated.weeklyGoal)} por semana e ${formatIntegerVolume(consolidated.dailyGoal)} por dia`
            : undefined,
        salesGoal.basedOnKnownMix
          ? "mantendo a proporção informada entre os itens"
          : undefined,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" · ")
    : salesGoal.reason;

  const breakEvenRevenueCents =
    results.breakEvenRevenueCents ??
    consolidated?.breakEvenRevenueCents ??
    null;
  const breakEvenTone: ReportTone =
    breakEvenRevenueCents === null
      ? "neutral"
      : results.monthlyGrossRevenueCents === null
        ? "neutral"
        : results.monthlyGrossRevenueCents >= breakEvenRevenueCents
          ? "positive"
          : "critical";

  const marginValue =
    results.finalMarginBasisPoints !== null
      ? formatBasisPoints(results.finalMarginBasisPoints)
      : consolidated
        ? "0%"
        : UNAVAILABLE;
  const marginSupporting = consolidated
    ? `No ponto de equilíbrio nada sobra · cada unidade deixa ${formatCurrency(results.items[0]?.unitContributionCents ?? 0)} para pagar os gastos do mês`
    : results.monthlyResultCents === null
      ? reason
      : results.monthlyResultCents > 0
        ? `Lucro de ${formatCurrency(results.monthlyResultCents)} no mês.`
        : results.monthlyResultCents < 0
          ? `Prejuízo de ${formatCurrency(Math.abs(results.monthlyResultCents))} no mês.`
          : "Sem lucro nem prejuízo no mês.";

  const drafts: Array<Omit<ReportIndicatorViewModel, "toneLabel">> = [
    {
      key: "sales",
      label: "Unidades necessárias no mês",
      value: salesGoal.available
        ? `${formatIntegerVolume(salesGoal.monthly)} unidades`
        : "Indisponível",
      tone: salesTone,
      description: sectionBody(snapshot, "sales_goal"),
      supportingText: salesSupporting,
      help: salesHelp,
      featured: true,
    },
    {
      key: "break_even",
      label: "Faturamento para cobrir os gastos",
      value: optionalCurrency(breakEvenRevenueCents),
      tone: breakEvenTone,
      description: sectionBody(snapshot, "break_even"),
      supportingText:
        breakEvenRevenueCents === null
          ? reason
          : results.monthlyGrossRevenueCents === null
            ? consolidated
              ? "Referência de equilíbrio no preço atual."
              : undefined
            : results.monthlyGrossRevenueCents >= breakEvenRevenueCents
              ? `Você fatura ${formatCurrency(results.monthlyGrossRevenueCents - breakEvenRevenueCents)} acima desse ponto.`
              : `Faltam ${formatCurrency(breakEvenRevenueCents - results.monthlyGrossRevenueCents)} para chegar a esse ponto.`,
      help: breakEvenHelp,
    },
    {
      key: "margin",
      label: "Margem de lucro",
      value: marginValue,
      tone: consolidated ? "neutral" : resultTone(results.monthlyResultCents),
      description: sectionBody(snapshot, "margin_diagnosis"),
      supportingText: marginSupporting,
      help: marginHelp,
    },
    {
      key: "revenue",
      label: "Quanto entraria neste cenário",
      value: optionalCurrency(results.monthlyGrossRevenueCents),
      tone: "neutral",
      supportingText:
        results.monthlyGrossRevenueCents === null
          ? reason
          : `Custos do mês: ${optionalCurrency(results.monthlyCostCents)}.`,
    },
  ];

  return drafts.map((draft) => ({
    ...draft,
    toneLabel: language.toneLabels[draft.tone],
  }));
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
  id: _id,
  createdAt,
  snapshot,
}: {
  id: number;
  createdAt: string;
  snapshot: CurrentDetailedReportSnapshot;
}): DetailedReportViewModel {
  const language = getReportLanguageProfile();
  const inputById = new Map(
    snapshot.inputs.items.map((item) => [item.id, item]),
  );
  const resultById = new Map(
    snapshot.results.items.map((result) => [result.itemId, result]),
  );
  const reason = unavailableReason(snapshot);
  const totalFeeBasisPoints =
    snapshot.inputs.taxRateBasisPoints + snapshot.inputs.cardFeeRateBasisPoints;
  // Older copy versions keep their persisted narrative, so the break-even
  // reference only applies to snapshots written with the current content.
  const scenario: DetailedBreakEvenScenario =
    snapshot.contentVersion === DETAILED_REPORT_CONTENT_VERSION
      ? deriveDetailedBreakEvenScenario(
          snapshot.inputs,
          snapshot.results,
          snapshot.policy,
        )
      : { consolidated: null, byItem: new Map() };
  const indicators = toDetailedIndicators(snapshot, scenario, language);

  const items: DetailedItemViewModel[] = snapshot.inputs.items.flatMap(
    (item) => {
      const result = resultById.get(item.id);
      if (!result) return [];
      const reference = scenario.byItem.get(item.id);
      const completeCostUnavailableReason =
        result.totalUnitCostCents === null
          ? reference
            ? `Referência vendendo ${formatIntegerVolume(reference.referenceVolume)} unidades deste item por mês.`
            : reason
          : undefined;
      const breakEvenPriceCents =
        result.breakEvenUnitPriceCents ?? reference?.breakEvenPriceCents ?? null;
      const breakEvenUnavailableReason =
        breakEvenPriceCents === null
          ? (completeCostUnavailableReason ??
            "As cobranças informadas impedem este cálculo.")
          : undefined;
      return [
        {
          id: item.id,
          category: snapshot.category,
          name: item.name,
          volumeLabel:
            item.monthlySalesVolume === null
              ? reference
                ? `Sem quantidade informada · equilíbrio com ${formatIntegerVolume(reference.referenceVolume)} unidades no mês`
                : "Vendas mensais ainda não informadas"
              : `${formatIntegerVolume(item.monthlySalesVolume)} unidades vendidas no mês`,
          statusLabel: result.directLoss
            ? "Perda por venda"
            : "Deixa valor para pagar o mês",
          statusTone: result.directLoss ? "critical" : "positive",
          priceLabel: formatCurrency(item.unitSalePriceCents),
          variableCostLabel: formatCurrency(result.variableUnitCostCents),
          feeLabel: formatCurrency(result.feeAmountCents),
          netRevenueLabel: formatCurrency(result.netUnitRevenueCents),
          fixedAllocationLabel: optionalCurrency(
            result.fixedAllocationCents ??
              reference?.fixedAllocationCents ??
              null,
          ),
          totalUnitCostLabel: optionalCurrency(
            result.totalUnitCostCents ?? reference?.totalUnitCostCents ?? null,
          ),
          unitProfitLabel: reference
            ? `${formatCurrency(0)} no equilíbrio`
            : optionalCurrency(result.unitProfitCents),
          realMarginLabel: reference
            ? "0% no equilíbrio"
            : optionalPercentage(result.realMarginBasisPoints),
          ...(completeCostUnavailableReason
            ? { completeCostUnavailableReason }
            : {}),
          unitContributionLabel: formatCurrency(result.unitContributionCents),
          monthlyContributionLabel: optionalCurrency(
            result.monthlyContributionCents,
          ),
          marginLabel: optionalPercentage(result.contributionMarginBasisPoints),
          breakEvenLabel: optionalCurrency(breakEvenPriceCents),
          ...(breakEvenUnavailableReason ? { breakEvenUnavailableReason } : {}),
          ...(reference
            ? {
                breakEvenReferenceLabel: `Para não ter prejuízo vendendo só este item: ${formatIntegerVolume(reference.referenceVolume)} unidades por mês.`,
              }
            : {}),
          technicalDetails: technicalDetails(item),
          discountSimulationBase: {
            originalPriceCents: item.unitSalePriceCents,
            unitCostCents:
              result.totalUnitCostCents ?? reference?.totalUnitCostCents ?? null,
            totalFeeBasisPoints,
            minimumPriceCents: breakEvenPriceCents,
          },
        },
      ];
    },
  );

  const comparison = snapshot.results.items
    .flatMap<DetailedComparisonEntryViewModel>((result) => {
      const input = inputById.get(result.itemId);
      if (!input) return [];
      const complete =
        result.unitProfitCents !== null && input.monthlySalesVolume !== null;
      const amountCents =
        result.unitProfitCents !== null && input.monthlySalesVolume !== null
          ? result.unitProfitCents * input.monthlySalesVolume
          : result.unitContributionCents;
      return [
        {
          id: result.itemId,
          name: input.name,
          amountCents,
          amountLabel: formatCurrency(amountCents),
          contextLabel: complete ? "no mês" : "por unidade",
          statusLabel:
            amountCents < 0
              ? "Reduz o resultado"
              : complete
                ? "Resultado estimado do item"
                : "Ajuda a pagar os gastos do mês",
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
      scenarioLabel: formatReportScenario(snapshot.scenario),
      createdAtLabel: `Gerado em ${formatReportDate(createdAt)}`,
    },
    executiveSummary: {
      ...snapshot.executiveSummary,
      verdict: {
        ...snapshot.executiveSummary.verdict,
        toneLabel: language.toneLabels[snapshot.executiveSummary.verdict.tone],
      },
      facts: snapshot.executiveSummary.facts,
      answers: toDetailedSummaryAnswers(snapshot),
    },
    indicators,
    sections: snapshot.sections
      .filter(({ key }) => key !== "hidden_cost")
      .map((section) => ({
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
