import type { PlainLanguageHelpContent } from "@/components/shared/plain-language-help";

import {
  formatBasisPoints,
  formatCurrency,
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
  type ReportSnapshot,
  type ServiceReportSnapshot,
} from "../types";
import {
  getReportLanguageProfile,
  type ReportLanguageProfile,
} from "./report-language";
import { toComfortableReportAnswers } from "./to-comfortable-report-answers";

type ReportNumberViewModel = {
  key:
    | "price"
    | "margin"
    | "profit"
    | "minimum"
    | "sales"
    | "revenue"
    | "costs"
    | "result"
    | "break_even";
  label: string;
  value: string;
  supportingText?: string;
  help?: PlainLanguageHelpContent;
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
  numbers: ReportNumberViewModel[];
  sections: ReportSectionViewModel[];
  discountSimulationBase: ReportDiscountSimulationBase;
  discountSimulationContext: {
    category: QuickReportSnapshot["category"];
  };
};

const marginHelp = {
  triggerLabel: "Entenda este valor",
  title: "Quanto sobra a cada R$ 100",
  description:
    "Mostra quanto fica depois de pagar todos os valores considerados neste diagnóstico.",
  technicalTerm: "margem real",
} as const satisfies PlainLanguageHelpContent;

const minimumPriceHelp = {
  triggerLabel: "Como calculamos?",
  title: "Menor preço para não ficar no prejuízo",
  description:
    "Inclui o custo da unidade, as cobranças da venda e a parte dos gastos mensais quando existe uma quantidade informada.",
} as const satisfies PlainLanguageHelpContent;

const unknownVolumeHelp = {
  triggerLabel: "Por que está indisponível?",
  title: "Falta uma quantidade para completar o cálculo",
  description:
    "Informe uma quantidade maior que zero para dividir os gastos do mês e calcular o custo completo, o menor preço e o resultado.",
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
): ReportExecutiveSummaryAnswerViewModel[] {
  const answers = toComfortableReportAnswers(snapshot.executiveSummary.answers);
  if (!usesCurrentAnswerContent(snapshot)) return answers;

  return answers.map((answer) => ({
    ...answer,
    help: answerHelp(snapshot, answer.key),
  }));
}

function optionalCurrency(
  value: number | null,
  unavailable = "Ainda não calculado",
): string {
  return value === null ? unavailable : formatCurrency(value);
}

function optionalPercentage(
  value: number | null,
  unavailable = "Ainda não calculado",
): string {
  return value === null ? unavailable : formatBasisPoints(value);
}

function salesSupportingText(
  weekly: number | null,
  daily: number | null,
): string | undefined {
  if (weekly === null) return undefined;
  return `${weekly} por semana${daily === null ? "" : ` e ${daily} por dia`}.`;
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

function toServiceNumbers(
  snapshot: ServiceReportSnapshot,
): ReportNumberViewModel[] {
  const plural = snapshot.unit === "hour" ? "horas" : "atendimentos";
  const singular = formatReportUnit(snapshot.unit);
  const priceHelp = normalizationHelp(snapshot);
  const unavailableReason = serviceUnavailableReason(snapshot);
  const salesUnavailableReason =
    snapshot.results.monthlySalesGoal === null
      ? (unavailableReason ??
        "O valor que sobra por serviço precisa ser positivo para calcular a quantidade.")
      : undefined;
  return [
    {
      key: "sales",
      label: "Quantidade de serviços por mês",
      value:
        snapshot.results.monthlySalesGoal === null
          ? "Ainda não calculado"
          : `${snapshot.results.monthlySalesGoal} ${plural}`,
      supportingText:
        salesSupportingText(
          snapshot.results.weeklySalesGoal,
          snapshot.results.dailySalesGoal,
        ) ?? salesUnavailableReason,
    },
    {
      key: "price",
      label: "Preço atual",
      value: formatCurrency(snapshot.results.currentPriceCents),
      ...(priceHelp ? { help: priceHelp } : {}),
    },
    {
      key: "minimum",
      label: "Menor preço para não ficar no prejuízo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
      supportingText:
        snapshot.results.minimumPriceCents === null
          ? unavailableReason
          : undefined,
      help: minimumPriceHelp,
    },
    {
      key: "profit",
      label: `Resultado por ${singular}`,
      value: optionalCurrency(snapshot.results.unitProfitCents),
      supportingText:
        snapshot.results.unitProfitCents === null
          ? unavailableReason
          : undefined,
    },
    {
      key: "margin",
      label: "Quanto sobra a cada R$ 100",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
      supportingText:
        snapshot.results.realMarginBasisPoints === null
          ? unavailableReason
          : undefined,
      help: marginHelp,
    },
  ];
}

function toUnitNumbers(
  snapshot: ProductReportSnapshot | ProductionReportSnapshot,
): ReportNumberViewModel[] {
  const isProduct = snapshot.category === "product";
  const volumeMissing =
    snapshot.results.monthlySalesVolumeUsed === null ||
    snapshot.results.monthlySalesVolumeUsed === 0;
  const unitWord = isProduct ? "vendas" : "unidades";
  const numbers: ReportNumberViewModel[] = [
    {
      key: "sales",
      label: "Vendas necessárias no mês",
      value:
        snapshot.results.monthlySalesGoal === null
          ? "Ainda não calculado"
          : `${snapshot.results.monthlySalesGoal} ${unitWord}`,
      supportingText: salesSupportingText(
        snapshot.results.weeklySalesGoal,
        snapshot.results.dailySalesGoal,
      ),
    },
    {
      key: "price",
      label: "Preço atual",
      value: formatCurrency(snapshot.results.currentPriceCents),
      ...(isProduct &&
      snapshot.scenario === "digital" &&
      snapshot.results.purchaseUnitCostCents === 0
        ? { help: digitalCostHelp }
        : {}),
    },
    {
      key: "minimum",
      label: "Menor preço para não ficar no prejuízo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
      supportingText:
        snapshot.results.minimumPriceCents === null && volumeMissing
          ? "Informe uma quantidade maior que zero para dividir os gastos do mês."
          : undefined,
      help:
        snapshot.results.minimumPriceCents === null && volumeMissing
          ? unknownVolumeHelp
          : minimumPriceHelp,
    },
    {
      key: "margin",
      label: "Quanto sobra a cada R$ 100",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
      supportingText:
        snapshot.results.realMarginBasisPoints === null && volumeMissing
          ? "Informe uma quantidade maior que zero para calcular."
          : undefined,
      help: marginHelp,
    },
    {
      key: "profit",
      label: "Resultado do mês",
      value: optionalCurrency(snapshot.results.monthlyResultCents),
      supportingText:
        snapshot.results.monthlyResultCents === null
          ? "Informe uma quantidade para calcular o resultado do mês."
          : undefined,
      ...(snapshot.results.monthlyResultCents === null
        ? { help: unknownVolumeHelp }
        : {}),
    },
  ];
  return numbers;
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
  const numbers =
    snapshot.category === "service"
      ? toServiceNumbers(snapshot)
      : toUnitNumbers(snapshot);

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
      answers: toSummaryAnswers(snapshot),
    },
    numbers,
    sections: snapshot.sections
      .filter(({ key }) => key !== "hidden_cost")
      .map((section) => ({
        ...section,
        toneLabel: language.toneLabels[section.tone],
      })),
    discountSimulationBase: snapshot.discountSimulationBase,
    discountSimulationContext: { category: snapshot.category },
  };
}

export {
  toReportViewModel,
  type ReportExecutiveSummaryViewModel,
  type ReportNumberViewModel,
  type ReportSectionViewModel,
  type ReportViewModel,
};
