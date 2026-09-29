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
  DETAILED_REPORT_CONTENT_VERSION,
  type CurrentDetailedReportSnapshot,
  type ExecutiveSummaryAnswer,
  type ReportDiscountSimulationBase,
} from "../types";
import { getReportLanguageProfile } from "./report-language";
import { toComfortableReportAnswers } from "./to-comfortable-report-answers";
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
    "É a estimativa de faturamento mensal necessária para pagar os gastos do mês com os valores deixados pelas vendas.",
  technicalTerm: "faturamento de equilíbrio",
};

const marginHelp: PlainLanguageHelpContent = {
  title: "Quanto sobra a cada R$ 100?",
  description:
    "Mostra quanto fica depois dos custos dos itens, impostos, cartão e gastos mensais usados neste diagnóstico.",
  technicalTerm: "margem real",
};

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
  return value === null ? "Ainda não calculado" : formatCurrency(value);
}

function optionalPercentage(value: number | null): string {
  return value === null ? "Ainda não calculado" : formatBasisPoints(value);
}

function unavailableReason(snapshot: CurrentDetailedReportSnapshot): string {
  return snapshot.results.isPartial
    ? "Informe uma quantidade para dividir os gastos do mês."
    : "As informações atuais não permitem calcular este valor.";
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
  const salesGoal = calculateDetailedSalesGoal(
    snapshot.inputs,
    snapshot.results,
    snapshot.policy,
  );

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

  const salesNumber: ReportNumberViewModel = salesGoal.available
    ? {
        key: "sales",
        label: "Unidades necessárias no mês",
        value: `${formatIntegerVolume(salesGoal.monthly)} unidades`,
        ...(salesGoal.basedOnKnownMix &&
        salesGoal.weekly !== null &&
        salesGoal.daily !== null
          ? {
              supportingText: `Estimativa mantendo a proporção informada entre os itens. ${formatIntegerVolume(salesGoal.weekly)} por semana e ${formatIntegerVolume(salesGoal.daily)} por dia.`,
            }
          : {}),
      }
    : {
        key: "sales",
        label: "Unidades necessárias no mês",
        value: "Indisponível",
        supportingText: salesGoal.reason,
      };

  const numbers: ReportNumberViewModel[] = [
    salesNumber,
    number(
      "revenue",
      "Quanto entraria neste cenário",
      optionalCurrency(snapshot.results.monthlyGrossRevenueCents),
    ),
    number(
      "costs",
      "Custos do mês",
      optionalCurrency(snapshot.results.monthlyCostCents),
    ),
    number(
      "result",
      "Resultado do mês estimado",
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
      const completeCostUnavailableReason =
        result.totalUnitCostCents === null ? reason : undefined;
      const breakEvenUnavailableReason =
        result.breakEvenUnitPriceCents === null
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
              ? "Vendas mensais ainda não informadas"
              : `${formatIntegerVolume(item.monthlySalesVolume)} unidades vendidas no mês`,
          statusLabel: result.directLoss
            ? "Perda por venda"
            : "Deixa valor para pagar o mês",
          statusTone: result.directLoss ? "critical" : "positive",
          priceLabel: formatCurrency(item.unitSalePriceCents),
          variableCostLabel: formatCurrency(result.variableUnitCostCents),
          feeLabel: formatCurrency(result.feeAmountCents),
          netRevenueLabel: formatCurrency(result.netUnitRevenueCents),
          fixedAllocationLabel: optionalCurrency(result.fixedAllocationCents),
          totalUnitCostLabel: optionalCurrency(result.totalUnitCostCents),
          unitProfitLabel: optionalCurrency(result.unitProfitCents),
          realMarginLabel: optionalPercentage(result.realMarginBasisPoints),
          ...(completeCostUnavailableReason
            ? { completeCostUnavailableReason }
            : {}),
          unitContributionLabel: formatCurrency(result.unitContributionCents),
          monthlyContributionLabel: optionalCurrency(
            result.monthlyContributionCents,
          ),
          marginLabel: optionalPercentage(result.contributionMarginBasisPoints),
          breakEvenLabel: optionalCurrency(result.breakEvenUnitPriceCents),
          ...(breakEvenUnavailableReason ? { breakEvenUnavailableReason } : {}),
          technicalDetails: technicalDetails(item),
          discountSimulationBase: {
            originalPriceCents: item.unitSalePriceCents,
            unitCostCents: result.totalUnitCostCents,
            totalFeeBasisPoints,
            minimumPriceCents: result.breakEvenUnitPriceCents,
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
    numbers,
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
