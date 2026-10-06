import type { PlainLanguageHelpContent } from "@/components/shared/plain-language-help";

import {
  deriveQuickBreakEvenScenario,
  type BreakEvenScenario,
} from "../domain/break-even-scenario";
import { calculateBreakEvenRevenue } from "../domain/unit-economics";
import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
  formatReportDate,
  formatReportScenario,
  formatReportUnit,
} from "../formatters";
import { isDetailedReportSnapshot } from "../schemas/report-snapshot.schema";
import {
  PRODUCT_CONTENT_VERSION,
  PRODUCTION_CONTENT_VERSION,
  SERVICE_REPORT_CONTENT_VERSION,
  type ExecutiveSummaryAnswer,
  type ProductReportSnapshot,
  type ProductionReportSnapshot,
  type QuickReportSnapshot,
  type ReportDiscountSimulationBase,
  type ReportSectionKey,
  type ReportSnapshot,
  type ReportTone,
  type ServiceReportSnapshot,
} from "../types";
import {
  getReportLanguageProfile,
  type ReportLanguageProfile,
} from "./report-language";
import { toComfortableReportAnswers } from "./to-comfortable-report-answers";

type ReportIndicatorKey =
  | "price"
  | "minimum"
  | "sales"
  | "margin"
  | "discount"
  | "revenue"
  | "break_even";

type ReportIndicatorDetail = {
  id: string;
  label: string;
  value: string;
};

type ReportIndicatorViewModel = {
  key: ReportIndicatorKey;
  label: string;
  value: string;
  tone: ReportTone;
  toneLabel: string;
  description?: string;
  supportingText?: string;
  help?: PlainLanguageHelpContent;
  featured?: boolean;
  unavailable?: boolean;
  details?: ReportIndicatorDetail[];
};

type ReportExecutiveSummaryAnswerViewModel = ExecutiveSummaryAnswer & {
  help?: PlainLanguageHelpContent;
};

type ReportExecutiveSummaryViewModel = Omit<
  QuickReportSnapshot["executiveSummary"],
  "verdict" | "facts" | "answers"
> & {
  verdict: QuickReportSnapshot["executiveSummary"]["verdict"] & {
    toneLabel: string;
  };
  facts: Array<
    QuickReportSnapshot["executiveSummary"]["facts"][number] & {
      help?: PlainLanguageHelpContent;
    }
  >;
  answers: ReportExecutiveSummaryAnswerViewModel[];
};

type ReportSectionViewModel = QuickReportSnapshot["sections"][number] & {
  toneLabel: string;
};

/** Data the simulator needs to show how many sales a discount requires. */
type ReportDiscountBreakEvenReference = {
  effectiveFixedCostCents: number;
  directUnitCostCents: number;
  referenceVolume: number;
};

type ReportDiscountSimulationContext = {
  category: QuickReportSnapshot["category"];
  breakEvenReference: ReportDiscountBreakEvenReference | null;
};

type ReportViewModel = {
  language: ReportLanguageProfile;
  identity: {
    id: number;
    title: string;
    categoryLabel: string;
    scenarioLabel: string;
    createdAtLabel: string;
    unitLabel: string;
  };
  executiveSummary: ReportExecutiveSummaryViewModel;
  indicators: ReportIndicatorViewModel[];
  sections: ReportSectionViewModel[];
  discountSimulationBase: ReportDiscountSimulationBase;
  discountSimulationContext: ReportDiscountSimulationContext;
};

const UNAVAILABLE = "Ainda não calculado";

const marginHelp = {
  triggerLabel: "Entenda esse valor",
  title: "Margem de lucro",
  description:
    "A margem de lucro mostra quanto sobra de cada R$ 100 vendidos depois de pagar tudo: o custo do que você vende, impostos, cartão e a parte dos gastos do mês. Uma margem de 20% significa que, de cada R$ 100, R$ 20 ficam com você. Se for negativa, você está pagando para vender.",
  technicalTerm: "margem de lucro real",
} as const satisfies PlainLanguageHelpContent;

const minimumPriceHelp = {
  triggerLabel: "Como calculamos?",
  title: "Este é o preço de equilíbrio",
  description:
    "É o preço em que a venda paga exatamente o custo da unidade, impostos, cartão e a parte dos gastos do mês que cabe a ela, sem lucro nem prejuízo. Abaixo dele, cada venda dá prejuízo. Quando a quantidade vendida não é informada, usamos a quantidade de equilíbrio como referência.",
  technicalTerm: "preço de equilíbrio",
} as const satisfies PlainLanguageHelpContent;

const salesGoalHelp = {
  triggerLabel: "Como calculamos?",
  title: "Quantidade de equilíbrio",
  description:
    "Dividimos os gastos do mês pelo valor que cada venda deixa depois do custo da unidade, impostos e cartão. Vendendo essa quantidade você paga tudo; cada venda a mais vira lucro.",
  technicalTerm: "ponto de equilíbrio",
} as const satisfies PlainLanguageHelpContent;

const discountHelp = {
  triggerLabel: "Entenda esse valor",
  title: "Desconto máximo sem prejuízo",
  description:
    "É o maior desconto que ainda deixa o preço acima do preço de equilíbrio. É um limite calculado, não uma recomendação de desconto. Use o simulador para testar outros valores.",
} as const satisfies PlainLanguageHelpContent;

const digitalCostHelp = {
  triggerLabel: "Entenda este custo",
  title: "Quanto esta unidade custa",
  description:
    "Um produto digital pode não ter custo direto. Quando existe, consideramos o valor informado para cada venda.",
} as const satisfies PlainLanguageHelpContent;

const actionAnswerHelp = {
  triggerLabel: "Por que este passo?",
  title: "Como escolhemos a prioridade",
  description:
    "Primeiro tratamos uma perda que acontece em cada venda. Depois, dados ausentes, prejuízo no resultado e quantidade de vendas. Assim, não sugerimos vender mais quando cada nova venda aumenta a perda.",
} as const satisfies PlainLanguageHelpContent;

function usesCurrentAnswerContent(snapshot: QuickReportSnapshot): boolean {
  if (snapshot.category === "service") {
    return snapshot.contentVersion === SERVICE_REPORT_CONTENT_VERSION;
  }
  if (snapshot.category === "product") {
    return snapshot.contentVersion === PRODUCT_CONTENT_VERSION;
  }
  return snapshot.contentVersion === PRODUCTION_CONTENT_VERSION;
}

function answerHelp(
  snapshot: QuickReportSnapshot,
  key: ExecutiveSummaryAnswer["key"],
  scenario: BreakEvenScenario | null,
): PlainLanguageHelpContent {
  if (key === "immediate_action") return actionAnswerHelp;

  if (snapshot.category === "service") {
    return key === "profitability"
      ? {
          triggerLabel: "Como calculamos?",
          title: "Como calculamos o resultado do serviço",
          description:
            "Distribuímos os gastos mensais e o valor que você quer receber pela rotina informada. Depois descontamos essa parte, os materiais e as cobranças do preço de cada hora ou atendimento.",
        }
      : {
          triggerLabel: "O que está incluído?",
          title: "O que o preço precisa pagar",
          description:
            "O menor preço considera a rotina informada, os gastos mensais, o valor que você quer receber, os materiais e as cobranças da venda.",
        };
  }

  if (key === "profitability") {
    if (scenario) {
      return {
        triggerLabel: "Como calculamos?",
        title: "Por que mostramos o ponto de equilíbrio",
        description:
          "Sem a quantidade vendida não dá para somar o resultado do mês. Então calculamos quantas vendas pagam os gastos do mês: abaixo disso há prejuízo, acima há lucro.",
      };
    }
    const directCost =
      snapshot.category === "production"
        ? "o custo de fabricação"
        : snapshot.scenario === "digital"
          ? "o custo por venda"
          : "o custo de compra";
    return {
      triggerLabel: "Como calculamos?",
      title: "Como calculamos o resultado do mês",
      description: `Multiplicamos o valor deixado por cada venda pela quantidade informada e descontamos os gastos mensais e o pró-labore incluído. Antes disso, cada venda já desconta ${directCost}, impostos e cartão.`,
    };
  }

  if (scenario) {
    return {
      triggerLabel: "O que está incluído?",
      title: "O preço de equilíbrio",
      description:
        "Com a quantidade de equilíbrio, o preço atual paga o custo da unidade, impostos, cartão e a parte dos gastos do mês. Se você vender menos, falta dinheiro; se vender mais, sobra.",
    };
  }
  const volumeMissing =
    snapshot.results.monthlySalesVolumeUsed === null ||
    snapshot.results.monthlySalesVolumeUsed === 0;
  return volumeMissing
    ? {
        triggerLabel: "Por que ainda não sabemos?",
        title: "Falta uma quantidade para completar o preço",
        description:
          "Sem uma quantidade maior que zero, não dividimos os gastos mensais entre as unidades. Por isso ainda não é possível confirmar se o preço paga todos os gastos.",
      }
    : {
        triggerLabel: "O que está incluído?",
        title: "O que o preço precisa pagar",
        description:
          "O menor preço inclui o custo direto, impostos, cartão e a parte dos gastos mensais correspondente à quantidade informada. Se a quantidade mudar, esse valor também pode mudar.",
      };
}

function toSummaryAnswers(
  snapshot: QuickReportSnapshot,
  scenario: BreakEvenScenario | null,
): ReportExecutiveSummaryAnswerViewModel[] {
  const answers = toComfortableReportAnswers(snapshot.executiveSummary.answers);
  if (!usesCurrentAnswerContent(snapshot)) return answers;

  return answers.map((answer) => ({
    ...answer,
    help: answerHelp(snapshot, answer.key, scenario),
  }));
}

function optionalCurrency(value: number | null): string {
  return value === null ? UNAVAILABLE : formatCurrency(value);
}

function optionalPercentage(value: number | null): string {
  return value === null ? UNAVAILABLE : formatBasisPoints(value);
}

function sectionBody(
  snapshot: QuickReportSnapshot,
  key: ReportSectionKey,
): string | undefined {
  return snapshot.sections.find((section) => section.key === key)?.body;
}

function resultTone(result: number | null): ReportTone {
  if (result === null) return "neutral";
  if (result > 0) return "positive";
  if (result < 0) return "critical";
  return "warning";
}

function discountTone(percent: number | null): ReportTone {
  if (percent === null) return "neutral";
  return percent > 0 ? "positive" : "warning";
}

function priceComparison(
  currentPriceCents: number,
  minimumPriceCents: number,
): { tone: ReportTone; text: string } {
  const difference = currentPriceCents - minimumPriceCents;
  if (difference >= 0) {
    return {
      tone: "positive",
      text:
        difference === 0
          ? "Seu preço está exatamente no limite."
          : `Seu preço fica ${formatCurrency(difference)} acima do menor preço.`,
    };
  }
  return {
    tone: "critical",
    text: `Faltam ${formatCurrency(Math.abs(difference))} para o preço pagar tudo.`,
  };
}

function periodGoalText(
  weekly: number | null,
  daily: number | null,
): string | undefined {
  if (weekly === null) return undefined;
  return `${formatIntegerVolume(weekly)} por semana${daily === null ? "" : ` e ${formatIntegerVolume(daily)} por dia`}`;
}

function joinSupporting(parts: Array<string | undefined>): string | undefined {
  const filtered = parts.filter((part): part is string => Boolean(part));
  return filtered.length > 0 ? filtered.join(" · ") : undefined;
}

function serviceUnavailableReason(
  snapshot: ServiceReportSnapshot,
): string | undefined {
  if (snapshot.results.currentPriceCents <= 0) {
    return "Informe um preço maior que zero para calcular.";
  }
  if (snapshot.results.structureUnitCostCents === null) {
    return "Informe uma rotina de trabalho válida para calcular.";
  }
  return undefined;
}

function sourcePriceLabel(snapshot: ServiceReportSnapshot): string {
  const labels = {
    minute: "minuto",
    hour: "hora",
    day: "dia",
    week: "semana",
    month: "mês",
    appointment: "atendimento",
  } as const;
  return `${formatCurrency(snapshot.source.currentPriceCents)} por ${labels[snapshot.source.pricingMethod]}`;
}

function normalizationHelp(
  snapshot: ServiceReportSnapshot,
): PlainLanguageHelpContent | undefined {
  if (
    snapshot.source.pricingMethod === "hour" ||
    snapshot.source.pricingMethod === "appointment"
  ) {
    return undefined;
  }
  return {
    triggerLabel: "Entenda a conversão",
    title: "Por que mostramos o valor por hora?",
    description: `Você informou ${sourcePriceLabel(snapshot)}. Para comparar preço e gastos na mesma medida, isso equivale a ${formatCurrency(snapshot.results.currentPriceCents)} por hora.`,
  };
}

type IndicatorDraft = Omit<ReportIndicatorViewModel, "toneLabel">;

function withToneLabels(
  drafts: IndicatorDraft[],
  language: ReportLanguageProfile,
): ReportIndicatorViewModel[] {
  return drafts.map((draft) => ({
    ...draft,
    toneLabel: language.toneLabels[draft.tone],
  }));
}

function toServiceIndicators(snapshot: ServiceReportSnapshot): IndicatorDraft[] {
  const results = snapshot.results;
  const plural = snapshot.unit === "hour" ? "horas" : "atendimentos";
  const singular = formatReportUnit(snapshot.unit);
  const priceHelp = normalizationHelp(snapshot);
  const unavailableReason = serviceUnavailableReason(snapshot);
  const comparison =
    results.minimumPriceCents === null
      ? null
      : priceComparison(results.currentPriceCents, results.minimumPriceCents);

  return [
    {
      key: "price",
      label: "Preço de venda",
      value: formatCurrency(results.currentPriceCents),
      tone: "neutral",
      description: `Preço considerado por ${singular}.`,
      ...(priceHelp ? { help: priceHelp } : {}),
    },
    {
      key: "minimum",
      label: "Menor preço para não ficar no prejuízo",
      value: optionalCurrency(results.minimumPriceCents),
      tone: comparison?.tone ?? "neutral",
      description: sectionBody(snapshot, "break_even"),
      supportingText: comparison?.text ?? unavailableReason,
      help: minimumPriceHelp,
      unavailable: results.minimumPriceCents === null,
    },
    {
      key: "sales",
      label: "Quantidade de serviços por mês",
      value:
        results.monthlySalesGoal === null
          ? UNAVAILABLE
          : `${formatIntegerVolume(results.monthlySalesGoal)} ${plural}`,
      tone: results.monthlySalesGoal === null ? "critical" : "neutral",
      description: sectionBody(snapshot, "sales_goal"),
      supportingText:
        results.monthlySalesGoal === null
          ? (unavailableReason ??
            "O valor que sobra por serviço precisa ser positivo para calcular a quantidade.")
          : periodGoalText(results.weeklySalesGoal, results.dailySalesGoal),
      help: salesGoalHelp,
      featured: true,
      unavailable: results.monthlySalesGoal === null,
    },
    {
      key: "margin",
      label: "Margem de lucro",
      value: optionalPercentage(results.realMarginBasisPoints),
      tone: resultTone(results.unitProfitCents),
      description: sectionBody(snapshot, "margin_diagnosis"),
      supportingText:
        results.unitProfitCents === null
          ? unavailableReason
          : results.unitProfitCents > 0
            ? `Lucro de ${formatCurrency(results.unitProfitCents)} por ${singular}.`
            : results.unitProfitCents < 0
              ? `Prejuízo de ${formatCurrency(Math.abs(results.unitProfitCents))} por ${singular}.`
              : `Sem lucro nem prejuízo por ${singular}.`,
      help: marginHelp,
      unavailable: results.realMarginBasisPoints === null,
    },
    {
      key: "discount",
      label: "Desconto máximo sem prejuízo",
      value:
        results.breakEvenDiscountPercent === null
          ? UNAVAILABLE
          : `${results.breakEvenDiscountPercent}%`,
      tone: discountTone(results.breakEvenDiscountPercent),
      description: sectionBody(snapshot, "discount_simulator"),
      supportingText: "Teste outros valores no simulador abaixo.",
      help: discountHelp,
      unavailable: results.breakEvenDiscountPercent === null,
    },
  ];
}

function toUnitIndicators(
  snapshot: ProductReportSnapshot | ProductionReportSnapshot,
  scenario: BreakEvenScenario | null,
): IndicatorDraft[] {
  const results = snapshot.results;
  const isProduct = snapshot.category === "product";
  const unitWord = isProduct ? "vendas" : "unidades";
  const volume = results.monthlySalesVolumeUsed;
  const directLoss = results.unitContributionCents <= 0;
  const minimumPriceCents =
    results.minimumPriceCents ?? scenario?.breakEvenPriceCents ?? null;
  const comparison =
    minimumPriceCents === null || scenario
      ? null
      : priceComparison(results.currentPriceCents, minimumPriceCents);
  const goal = results.monthlySalesGoal;
  const breakEvenRevenueCents = calculateBreakEvenRevenue(
    results.effectiveFixedCostCents,
    results.currentPriceCents,
    results.unitContributionCents,
  );
  const weekly = results.weeklySalesGoal ?? scenario?.weeklyGoal ?? null;
  const daily = results.dailySalesGoal ?? scenario?.dailyGoal ?? null;
  const discountPercent =
    results.breakEvenDiscountPercent ??
    scenario?.breakEvenDiscountPercent ??
    null;

  const salesTone: ReportTone =
    goal === null
      ? "critical"
      : volume === null
        ? "neutral"
        : volume >= goal
          ? "positive"
          : "critical";
  const salesSupporting = joinSupporting([
    volume === null
      ? scenario
        ? "Referência de equilíbrio"
        : undefined
      : `Você informou ${formatIntegerVolume(volume)} ${unitWord} no mês`,
    periodGoalText(weekly, daily),
    breakEvenRevenueCents === null
      ? undefined
      : `${formatCurrency(breakEvenRevenueCents)} de faturamento no mês`,
  ]);

  const marginValue =
    results.realMarginBasisPoints !== null
      ? formatBasisPoints(results.realMarginBasisPoints)
      : scenario
        ? "0%"
        : UNAVAILABLE;
  const marginSupporting = scenario
    ? `No ponto de equilíbrio nada sobra · cada ${isProduct ? "venda" : "unidade"} deixa ${formatCurrency(results.unitContributionCents)}${scenario.contributionMarginBasisPoints === null ? "" : ` (${formatBasisPoints(scenario.contributionMarginBasisPoints)} do preço)`} para pagar os gastos do mês`
    : results.monthlyResultCents === null
      ? volume === 0
        ? `Sem vendas, o mês fecha com prejuízo de ${formatCurrency(results.effectiveFixedCostCents)}.`
        : directLoss
          ? `Cada ${isProduct ? "venda" : "unidade"} perde ${formatCurrency(Math.abs(results.unitContributionCents))} antes dos gastos do mês.`
          : "Informe a quantidade vendida para calcular."
      : results.monthlyResultCents > 0
        ? `Lucro de ${formatCurrency(results.monthlyResultCents)} no mês.`
        : results.monthlyResultCents < 0
          ? `Prejuízo de ${formatCurrency(Math.abs(results.monthlyResultCents))} no mês.`
          : "Sem lucro nem prejuízo no mês.";
  const marginTone: ReportTone = scenario
    ? "neutral"
    : results.monthlyResultCents !== null
      ? resultTone(results.monthlyResultCents)
      : directLoss || volume === 0
        ? "critical"
        : "neutral";

  return [
    {
      key: "price",
      label: "Preço de venda",
      value: formatCurrency(results.currentPriceCents),
      tone: "neutral",
      description: "Preço informado por unidade.",
      ...(snapshot.category === "product" &&
      snapshot.scenario === "digital" &&
      snapshot.results.purchaseUnitCostCents === 0
        ? { help: digitalCostHelp }
        : {}),
    },
    {
      key: "minimum",
      label: "Menor preço para não ficar no prejuízo",
      value: optionalCurrency(minimumPriceCents),
      tone:
        minimumPriceCents === null
          ? directLoss
            ? "critical"
            : "neutral"
          : (comparison?.tone ?? "neutral"),
      description: sectionBody(snapshot, "break_even"),
      supportingText: scenario
        ? `Referência com ${formatIntegerVolume(scenario.referenceVolume)} ${unitWord} no mês.`
        : (comparison?.text ??
          (volume === 0
            ? "Informe uma quantidade maior que zero para dividir os gastos do mês."
            : undefined)),
      help: minimumPriceHelp,
      unavailable: minimumPriceCents === null,
    },
    {
      key: "sales",
      label: "Vendas necessárias no mês",
      value:
        goal === null ? UNAVAILABLE : `${formatIntegerVolume(goal)} ${unitWord}`,
      tone: salesTone,
      description: sectionBody(snapshot, "sales_goal"),
      supportingText: salesSupporting,
      help: salesGoalHelp,
      featured: true,
      unavailable: goal === null,
    },
    {
      key: "margin",
      label: "Margem de lucro",
      value: marginValue,
      tone: marginTone,
      description: sectionBody(snapshot, "margin_diagnosis"),
      supportingText: marginSupporting,
      help: marginHelp,
      unavailable: results.realMarginBasisPoints === null && scenario === null,
    },
    {
      key: "discount",
      label: "Desconto máximo sem prejuízo",
      value: discountPercent === null ? UNAVAILABLE : `${discountPercent}%`,
      tone: directLoss ? "critical" : discountTone(discountPercent),
      description: sectionBody(snapshot, "discount_simulator"),
      supportingText: "Teste outros valores no simulador abaixo.",
      help: discountHelp,
      unavailable: discountPercent === null,
    },
  ];
}

function toDiscountSimulation(
  snapshot: QuickReportSnapshot,
  scenario: BreakEvenScenario | null,
): Pick<ReportViewModel, "discountSimulationBase" | "discountSimulationContext"> {
  if (snapshot.category === "service" || !scenario) {
    return {
      discountSimulationBase: snapshot.discountSimulationBase,
      discountSimulationContext: {
        category: snapshot.category,
        breakEvenReference: null,
      },
    };
  }
  const directUnitCostCents =
    snapshot.category === "product"
      ? snapshot.results.purchaseUnitCostCents
      : snapshot.results.productionUnitCostCents;
  return {
    discountSimulationBase: {
      ...snapshot.discountSimulationBase,
      unitCostCents: scenario.totalUnitCostCents,
      minimumPriceCents: scenario.breakEvenPriceCents,
    },
    discountSimulationContext: {
      category: snapshot.category,
      breakEvenReference: {
        effectiveFixedCostCents: snapshot.results.effectiveFixedCostCents,
        directUnitCostCents,
        referenceVolume: scenario.referenceVolume,
      },
    },
  };
}

function toReportViewModel({
  id,
  createdAt,
  snapshot,
}: {
  id: number;
  createdAt: string;
  snapshot: ReportSnapshot;
}): ReportViewModel {
  if (isDetailedReportSnapshot(snapshot)) {
    throw new Error("detailed_report_requires_dedicated_presenter");
  }

  const language = getReportLanguageProfile();
  const identityByCategory = {
    service: { title: "Diagnóstico de Serviço", categoryLabel: "Serviço" },
    product: { title: "Diagnóstico de Produto", categoryLabel: "Produto" },
    production: {
      title: "Diagnóstico de Produção",
      categoryLabel: "Produção",
    },
  } as const;
  const identity = identityByCategory[snapshot.category];
  // Older copy versions keep their persisted narrative, so the break-even
  // reference only applies to snapshots written with the current content.
  const scenario =
    snapshot.category !== "service" && usesCurrentAnswerContent(snapshot)
      ? deriveQuickBreakEvenScenario(snapshot.results, snapshot.policy)
      : null;
  const indicators =
    snapshot.category === "service"
      ? toServiceIndicators(snapshot)
      : toUnitIndicators(snapshot, scenario);

  return {
    language,
    identity: {
      id,
      ...identity,
      scenarioLabel: formatReportScenario(snapshot.scenario),
      createdAtLabel: formatReportDate(createdAt),
      unitLabel: formatReportUnit(snapshot.unit),
    },
    executiveSummary: {
      ...snapshot.executiveSummary,
      verdict: {
        ...snapshot.executiveSummary.verdict,
        toneLabel: language.toneLabels[snapshot.executiveSummary.verdict.tone],
      },
      facts: snapshot.executiveSummary.facts,
      answers: toSummaryAnswers(snapshot, scenario),
    },
    indicators: withToneLabels(indicators, language),
    sections: snapshot.sections
      .filter(({ key }) => key !== "hidden_cost")
      .map((section) => ({
        ...section,
        toneLabel: language.toneLabels[section.tone],
      })),
    ...toDiscountSimulation(snapshot, scenario),
  };
}

export {
  marginHelp,
  minimumPriceHelp,
  salesGoalHelp,
  toReportViewModel,
  type ReportDiscountBreakEvenReference,
  type ReportDiscountSimulationContext,
  type ReportExecutiveSummaryViewModel,
  type ReportIndicatorDetail,
  type ReportIndicatorKey,
  type ReportIndicatorViewModel,
  type ReportSectionViewModel,
  type ReportViewModel,
};
