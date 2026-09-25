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
  ProductReportSnapshotV3,
  ProductReportSnapshotV4,
  ProductionReportSnapshot,
  ProductionReportSnapshotV3,
  ProductionReportSnapshotV4,
  QuickReportSnapshot,
  ReportDiscountSimulationBase,
  ReportSnapshot,
  ServiceReportSnapshot,
  ServiceReportSnapshotV5,
} from "../types";
import {
  getReportLanguageProfile,
  type ReportLanguageProfile,
} from "./report-language";
import { isDetailedReportSnapshot } from "../schemas/report-snapshot.schema";

type ReportNumberViewModel = {
  key:
    | "price"
    | "margin"
    | "profit"
    | "minimum"
    | "target"
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
type LegacyProductSnapshot = Exclude<
  ProductReportSnapshot,
  ProductReportSnapshotV3 | ProductReportSnapshotV4
>;
type LegacyProductionSnapshot = Exclude<
  ProductionReportSnapshot,
  ProductionReportSnapshotV3 | ProductionReportSnapshotV4
>;

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
    mode: "legacy_target" | "service_attention" | "unit_attention";
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

const attentionBandHelp = {
  triggerLabel: "Entenda esta faixa",
  title: "Quanto sobra a cada R$ 100",
  description:
    "Abaixo de R$ 20 a cada R$ 100 é uma faixa de atenção do Lucrivo. Ela não é uma recomendação igual para todos os negócios.",
} as const satisfies PlainLanguageHelpContent;

const unknownVolumeHelp = {
  triggerLabel: "Por que está indisponível?",
  title: "Resultado mensal ainda não calculado",
  description:
    "A quantidade vendida não foi informada. Por isso, o resultado mensal permanece indisponível e a meta mensal aparece apenas como referência.",
} as const satisfies PlainLanguageHelpContent;

const digitalCostHelp = {
  triggerLabel: "Entenda este custo",
  title: "Custo por venda",
  description:
    "Um produto digital pode não ter custo direto. Quando existe, este valor considera a cobrança informada para cada venda.",
} as const satisfies PlainLanguageHelpContent;

function currentMinimumPriceHelp(
  category: "product" | "production",
  scenario: "resale" | "digital" | "manufacturing",
  partial: boolean,
): PlainLanguageHelpContent {
  const directCost =
    scenario === "digital"
      ? "custo por venda"
      : category === "production"
        ? "custo de fabricação"
        : "custo de compra";
  return {
    triggerLabel: "Como calculamos?",
    title: partial
      ? "Menor preço antes dos gastos mensais"
      : "Menor preço sem prejuízo",
    description: partial
      ? `Este valor inclui o ${directCost} e as cobranças da venda. Os gastos mensais ficam de fora até existir uma quantidade vendida.`
      : `Este valor inclui o ${directCost}, as cobranças da venda e a parte dos gastos mensais por unidade.`,
  };
}

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

function optionalCurrency(
  value: number | null,
  unavailable = "Indisponível",
): string {
  return value === null ? unavailable : formatCurrency(value);
}

function optionalPercentage(
  value: number | null,
  unavailable = "Indisponível",
): string {
  return value === null ? unavailable : formatBasisPoints(value);
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

function isCurrentProductSnapshot(
  snapshot: ProductReportSnapshot,
): snapshot is ProductReportSnapshotV3 | ProductReportSnapshotV4 {
  return (
    (snapshot.schemaVersion === 2 &&
      snapshot.calculationVersion === 2 &&
      snapshot.contentVersion === 3) ||
    (snapshot.schemaVersion === 3 &&
      snapshot.calculationVersion === 3 &&
      snapshot.contentVersion === 4)
  );
}

function isCurrentProductionSnapshot(
  snapshot: ProductionReportSnapshot,
): snapshot is ProductionReportSnapshotV3 | ProductionReportSnapshotV4 {
  return (
    (snapshot.schemaVersion === 2 &&
      snapshot.calculationVersion === 2 &&
      snapshot.contentVersion === 3) ||
    (snapshot.schemaVersion === 3 &&
      snapshot.calculationVersion === 3 &&
      snapshot.contentVersion === 4)
  );
}

function toCurrentProductNumbers(
  snapshot: ProductReportSnapshotV3 | ProductReportSnapshotV4,
): ReportNumberViewModel[] {
  const partial = snapshot.results.priceReferencesPartial;
  const monthly = snapshot.results.monthlySalesGoal;
  return [
    {
      key: "price",
      label: "Preço atual",
      value: formatCurrency(snapshot.results.currentPriceCents),
      ...(snapshot.scenario === "digital" &&
      snapshot.results.purchaseUnitCostCents === 0
        ? { help: digitalCostHelp }
        : {}),
    },
    {
      key: "minimum",
      label: partial
        ? "Menor preço antes dos gastos mensais"
        : "Menor preço sem prejuízo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
      help: currentMinimumPriceHelp("product", snapshot.scenario, partial),
    },
    {
      key: "margin",
      label: "Quanto sobra a cada R$ 100",
      value: optionalPercentage(
        snapshot.results.realMarginBasisPoints,
        snapshot.results.monthlySalesVolumeUsed === null
          ? "Ainda não calculado"
          : "Sem vendas para calcular",
      ),
      help: attentionBandHelp,
    },
    {
      key: "profit",
      label: "Resultado do mês",
      value: optionalCurrency(
        snapshot.results.monthlyResultCents,
        "Ainda não calculado",
      ),
      ...(partial ? { help: unknownVolumeHelp } : {}),
    },
    {
      key: "sales",
      label: "Vendas necessárias no mês",
      value: monthly === null ? "Indisponível" : `${monthly} vendas`,
      supportingText:
        monthly === null || snapshot.results.weeklySalesGoal === null
          ? undefined
          : `${snapshot.results.weeklySalesGoal} por semana e ${snapshot.results.dailySalesGoal ?? 0} por dia.`,
    },
  ];
}

function toCurrentProductionNumbers(
  snapshot: ProductionReportSnapshotV3 | ProductionReportSnapshotV4,
): ReportNumberViewModel[] {
  const partial = snapshot.results.priceReferencesPartial;
  const monthly = snapshot.results.monthlySalesGoal;
  return [
    {
      key: "price",
      label: "Preço atual",
      value: formatCurrency(snapshot.results.currentPriceCents),
    },
    {
      key: "minimum",
      label: partial
        ? "Menor preço antes dos gastos mensais"
        : "Menor preço sem prejuízo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
      help: currentMinimumPriceHelp("production", "manufacturing", partial),
    },
    {
      key: "margin",
      label: "Quanto sobra a cada R$ 100",
      value: optionalPercentage(
        snapshot.results.realMarginBasisPoints,
        snapshot.results.monthlySalesVolumeUsed === null
          ? "Ainda não calculado"
          : "Sem vendas para calcular",
      ),
      help: attentionBandHelp,
    },
    {
      key: "profit",
      label: "Resultado do mês",
      value: optionalCurrency(
        snapshot.results.monthlyResultCents,
        "Ainda não calculado",
      ),
      ...(partial ? { help: unknownVolumeHelp } : {}),
    },
    {
      key: "sales",
      label: "Vendas necessárias no mês",
      value: monthly === null ? "Indisponível" : `${monthly} unidades`,
      supportingText:
        monthly === null || snapshot.results.weeklySalesGoal === null
          ? undefined
          : `${snapshot.results.weeklySalesGoal} por semana e ${snapshot.results.dailySalesGoal ?? 0} por dia.`,
    },
  ];
}

function toProductNumbers(
  snapshot: LegacyProductSnapshot,
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
  snapshot: LegacyProductionSnapshot,
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
  if (isDetailedReportSnapshot(snapshot)) {
    throw new Error("detailed_report_requires_dedicated_presenter");
  }

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
      numbers = isCurrentProductSnapshot(snapshot)
        ? toCurrentProductNumbers(snapshot)
        : toProductNumbers(snapshot, language.isPlainLanguage);
      break;
    case "production":
      title = "Diagnóstico de Produção";
      categoryLabel = "Produção";
      numbers = isCurrentProductionSnapshot(snapshot)
        ? toCurrentProductionNumbers(snapshot)
        : toProductionNumbers(snapshot, language.isPlainLanguage);
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
      mode: normalizedService
        ? "service_attention"
        : (snapshot.category === "product" &&
              isCurrentProductSnapshot(snapshot)) ||
            (snapshot.category === "production" &&
              isCurrentProductionSnapshot(snapshot))
          ? "unit_attention"
          : "legacy_target",
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
