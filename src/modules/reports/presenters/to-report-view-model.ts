import type { PlainLanguageHelpContent } from "@/components/shared/plain-language-help";

import {
  formatBasisPoints,
  formatCurrency,
  formatReportDate,
  formatReportScenario,
  formatReportUnit,
} from "../formatters";
import { isDetailedReportSnapshot } from "../schemas/report-snapshot.schema";
import type {
  ProductReportSnapshot,
  ProductionReportSnapshot,
  QuickReportSnapshot,
  ReportDiscountSimulationBase,
  ReportSnapshot,
  ServiceReportSnapshot,
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

type ReportExecutiveSummaryViewModel = Omit<
  QuickReportSnapshot["executiveSummary"],
  "verdict" | "facts"
> & {
  verdict: QuickReportSnapshot["executiveSummary"]["verdict"] & {
    toneLabel: string;
  };
  facts: Array<
    QuickReportSnapshot["executiveSummary"]["facts"][number] & {
      help?: PlainLanguageHelpContent;
    }
  >;
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
  return [
    {
      key: "sales",
      label: "Quantidade de serviços por mês",
      value:
        snapshot.results.monthlySalesGoal === null
          ? "Ainda não calculado"
          : `${snapshot.results.monthlySalesGoal} ${plural}`,
      supportingText: salesSupportingText(
        snapshot.results.weeklySalesGoal,
        snapshot.results.dailySalesGoal,
      ),
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
      help: minimumPriceHelp,
    },
    {
      key: "profit",
      label: `Quanto sobra por ${singular}`,
      value: optionalCurrency(snapshot.results.unitProfitCents),
    },
    {
      key: "margin",
      label: "Quanto sobra a cada R$ 100",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
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
      answers: toComfortableReportAnswers(snapshot.executiveSummary.answers),
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
