import {
  formatBasisPoints,
  formatCurrency,
  formatReportDate,
  formatReportScenario,
  formatReportUnit,
} from "../formatters";
import type { PlainLanguageHelpContent } from "@/components/shared/plain-language-help";
import type {
  ProductReportSnapshot,
  ProductionReportSnapshot,
  ReportDiscountSimulationBase,
  ReportSnapshot,
  ServiceReportSnapshot,
  ServiceReportSnapshotV5,
} from "../types";
import {
  getReportLanguageProfile,
  type ReportLanguageProfile,
} from "./report-language";

type ReportNumberViewModel = {
  key: "price" | "margin" | "profit" | "minimum" | "target" | "sales";
  label: string;
  value: string;
  supportingText?: string;
  help?: PlainLanguageHelpContent;
};

type ReportExecutiveSummaryViewModel = Omit<
  ReportSnapshot["executiveSummary"],
  "verdict" | "facts"
> & {
  verdict: ReportSnapshot["executiveSummary"]["verdict"] & {
    toneLabel: string;
  };
  facts: Array<
    ReportSnapshot["executiveSummary"]["facts"][number] & {
      help?: PlainLanguageHelpContent;
    }
  >;
};

type ReportSectionViewModel = ReportSnapshot["sections"][number] & {
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
    category: ReportSnapshot["category"];
    usesAttentionBand: boolean;
  };
};

const marginHelp = {
  triggerLabel: "Entenda este valor",
  title: "Quanto sobra a cada R$ 100",
  description:
    "Mostra quanto fica no negócio depois de pagar os gastos usados neste cálculo.",
  technicalTerm: "margem",
} as const satisfies PlainLanguageHelpContent;

const serviceMarginHelp = {
  triggerLabel: "Entenda esta faixa",
  title: "Quanto sobra a cada R$ 100",
  description:
    "Abaixo de R$ 15 a cada R$ 100 é uma faixa de atenção: o preço paga os gastos, mas deixa pouca folga. Não é uma recomendação igual para todos os negócios.",
} as const satisfies PlainLanguageHelpContent;

const serviceMinimumPriceHelp = {
  triggerLabel: "Como calculamos?",
  title: "Menor preço sem prejuízo",
  description:
    "Este valor inclui os gastos mensais, quanto você quer receber, os materiais e as taxas que informou.",
} as const satisfies PlainLanguageHelpContent;

const targetPriceHelp = {
  triggerLabel: "Como calculamos?",
  title: "Preço para alcançar a meta",
  description:
    "É o preço calculado com seus gastos, taxas e a meta definida neste diagnóstico.",
  technicalTerm: "preço-alvo",
} as const satisfies PlainLanguageHelpContent;

const partialTargetPriceHelp = {
  ...targetPriceHelp,
  description:
    "É o preço calculado com seus gastos, taxas e a meta definida neste diagnóstico. Como você não informou as vendas do mês, os gastos mensais ainda não entram neste valor.",
} as const satisfies PlainLanguageHelpContent;

function optionalCurrency(value: number | null): string {
  return value === null ? "Indisponível" : formatCurrency(value);
}

function optionalPercentage(value: number | null): string {
  return value === null ? "Indisponível" : formatBasisPoints(value);
}

function toServiceNumbers(
  snapshot: ServiceReportSnapshot,
  plainLanguage: boolean,
): ReportNumberViewModel[] {
  const unitLabel = formatReportUnit(snapshot.unit);

  return [
    {
      key: "price",
      label: "Preço atual",
      value: formatCurrency(snapshot.results.currentPriceCents),
    },
    {
      key: "margin",
      label: plainLanguage ? "Quanto sobra a cada R$ 100" : "Margem real",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
      ...(plainLanguage ? { help: marginHelp } : {}),
    },
    {
      key: "profit",
      label: plainLanguage
        ? `Quanto sobra por ${unitLabel}`
        : `Lucro por ${unitLabel}`,
      value: optionalCurrency(snapshot.results.unitProfitCents),
    },
    {
      key: "minimum",
      label: plainLanguage ? "Menor preço sem prejuízo" : "Preço mínimo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
    },
    {
      key: "target",
      label: plainLanguage
        ? "Preço para alcançar a meta (15%)"
        : "Preço-alvo (15%)",
      value: optionalCurrency(snapshot.results.targetPriceCents),
      ...(plainLanguage ? { help: targetPriceHelp } : {}),
    },
  ];
}

function isNormalizedServiceSnapshot(
  snapshot: ReportSnapshot,
): snapshot is ServiceReportSnapshotV5 {
  return (
    snapshot.category === "service" &&
    snapshot.schemaVersion === 4 &&
    snapshot.calculationVersion === 3 &&
    snapshot.contentVersion === 5
  );
}

function sourcePriceLabel(snapshot: ServiceReportSnapshotV5): string {
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
  snapshot: ServiceReportSnapshotV5,
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

function toNormalizedServiceNumbers(
  snapshot: ServiceReportSnapshotV5,
): ReportNumberViewModel[] {
  const unit = snapshot.unit === "hour" ? "horas" : "atendimentos";
  const monthly = snapshot.results.monthlySalesGoal;
  const weekly = snapshot.results.weeklySalesGoal;
  const daily = snapshot.results.dailySalesGoal;
  const supporting =
    weekly === null
      ? undefined
      : `${weekly} por semana${daily === null ? "" : ` e ${daily} por dia de trabalho`}.`;

  return [
    {
      key: "price",
      label: "Preço atual",
      value: formatCurrency(snapshot.results.currentPriceCents),
    },
    {
      key: "minimum",
      label: "Menor preço sem prejuízo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
      help: serviceMinimumPriceHelp,
    },
    {
      key: "margin",
      label: "Quanto sobra a cada R$ 100",
      value:
        snapshot.results.realMarginBasisPoints === null
          ? "Indisponível"
          : formatCurrency(snapshot.results.realMarginBasisPoints),
      help: serviceMarginHelp,
    },
    {
      key: "sales",
      label: "Quantidade de serviços por mês",
      value: monthly === null ? "Indisponível" : `${monthly} ${unit}`,
      supportingText: supporting,
    },
  ];
}

function toProductNumbers(
  snapshot: ProductReportSnapshot,
  plainLanguage: boolean,
): ReportNumberViewModel[] {
  const partial = snapshot.results.priceReferencesPartial;

  return [
    {
      key: "price",
      label: "Preço atual",
      value: formatCurrency(snapshot.results.currentPriceCents),
    },
    {
      key: "margin",
      label: plainLanguage ? "Quanto sobra a cada R$ 100" : "Margem real",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
      ...(plainLanguage ? { help: marginHelp } : {}),
    },
    {
      key: "profit",
      label: plainLanguage
        ? partial
          ? "Quanto sobra antes dos gastos mensais"
          : "Quanto sobra por unidade"
        : partial
          ? "Contribuição por unidade"
          : "Lucro por unidade",
      value: optionalCurrency(
        partial
          ? snapshot.results.unitContributionCents
          : snapshot.results.unitProfitCents,
      ),
    },
    {
      key: "minimum",
      label: plainLanguage
        ? partial
          ? "Menor preço antes dos gastos mensais"
          : "Menor preço sem prejuízo"
        : partial
          ? "Preço mínimo (sem rateio fixo)"
          : "Preço mínimo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
    },
    {
      key: "target",
      label: plainLanguage
        ? partial
          ? "Preço para a meta, sem gastos mensais"
          : "Preço para alcançar a meta (20%)"
        : partial
          ? "Preço-alvo (sem rateio fixo)"
          : "Preço-alvo (20%)",
      value: optionalCurrency(snapshot.results.targetPriceCents),
      ...(plainLanguage
        ? { help: partial ? partialTargetPriceHelp : targetPriceHelp }
        : {}),
    },
  ];
}

function toProductionNumbers(
  snapshot: ProductionReportSnapshot,
  plainLanguage: boolean,
): ReportNumberViewModel[] {
  const partial = snapshot.results.priceReferencesPartial;

  return [
    {
      key: "price",
      label: "Preço atual",
      value: formatCurrency(snapshot.results.currentPriceCents),
    },
    {
      key: "margin",
      label: plainLanguage ? "Quanto sobra a cada R$ 100" : "Margem real",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
      ...(plainLanguage ? { help: marginHelp } : {}),
    },
    {
      key: "profit",
      label: plainLanguage
        ? partial
          ? "Quanto sobra antes dos gastos mensais"
          : "Quanto sobra por unidade"
        : partial
          ? "Contribuição por unidade"
          : "Lucro por unidade",
      value: optionalCurrency(
        partial
          ? snapshot.results.unitContributionCents
          : snapshot.results.unitProfitCents,
      ),
    },
    {
      key: "minimum",
      label: plainLanguage
        ? partial
          ? "Menor preço antes dos gastos mensais"
          : "Menor preço sem prejuízo"
        : partial
          ? "Preço mínimo (sem rateio fixo)"
          : "Preço mínimo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
    },
    {
      key: "target",
      label: plainLanguage
        ? partial
          ? "Preço para a meta, sem gastos mensais"
          : "Preço para alcançar a meta (20%)"
        : partial
          ? "Preço-alvo (sem rateio fixo)"
          : "Preço-alvo (20%)",
      value: optionalCurrency(snapshot.results.targetPriceCents),
      ...(plainLanguage
        ? { help: partial ? partialTargetPriceHelp : targetPriceHelp }
        : {}),
    },
  ];
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
  const unitLabel = formatReportUnit(snapshot.unit);
  const language = getReportLanguageProfile(snapshot);
  const normalizedService = isNormalizedServiceSnapshot(snapshot);
  let title: string;
  let categoryLabel: string;
  let numbers: ReportNumberViewModel[];

  switch (snapshot.category) {
    case "service":
      title = "Diagnóstico de Serviço";
      categoryLabel = "Serviço";
      numbers = normalizedService
        ? toNormalizedServiceNumbers(snapshot)
        : toServiceNumbers(snapshot, language.isPlainLanguage);
      break;
    case "product":
      title = "Diagnóstico de Produto";
      categoryLabel = "Produto";
      numbers = toProductNumbers(snapshot, language.isPlainLanguage);
      break;
    case "production":
      title = "Diagnóstico de Produção";
      categoryLabel = "Produção";
      numbers = toProductionNumbers(snapshot, language.isPlainLanguage);
      break;
  }

  return {
    language,
    identity: {
      id,
      title,
      categoryLabel,
      scenarioLabel: formatReportScenario(snapshot.scenario),
      createdAtLabel: formatReportDate(createdAt),
      unitLabel,
    },
    executiveSummary: {
      ...snapshot.executiveSummary,
      verdict: {
        ...snapshot.executiveSummary.verdict,
        toneLabel: language.toneLabels[snapshot.executiveSummary.verdict.tone],
      },
      facts: snapshot.executiveSummary.facts.map((fact) =>
        normalizedService && fact.key === "price"
          ? { ...fact, help: normalizationHelp(snapshot) }
          : fact,
      ),
    },
    numbers,
    sections: snapshot.sections.map((section) => ({
      ...section,
      toneLabel: language.toneLabels[section.tone],
    })),
    discountSimulationBase: snapshot.discountSimulationBase,
    discountSimulationContext: {
      category: snapshot.category,
      usesAttentionBand: normalizedService,
    },
  };
}

export {
  toReportViewModel,
  type ReportExecutiveSummaryViewModel,
  type ReportNumberViewModel,
  type ReportSectionViewModel,
  type ReportViewModel,
};
