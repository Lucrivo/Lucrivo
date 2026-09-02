import {
  formatBasisPoints,
  formatCurrency,
  formatReportDate,
  formatReportScenario,
  formatReportUnit,
} from "../formatters";
import type {
  ProductReportSnapshotV1,
  ProductionReportSnapshotV1,
  ReportDiscountSimulationBase,
  ReportSnapshot,
  ReportTone,
  ServiceReportSnapshotV2,
} from "../types";

type ReportNumberViewModel = {
  key: "price" | "margin" | "profit" | "minimum" | "target";
  label: string;
  value: string;
};

type ReportExecutiveSummaryViewModel = Omit<
  ReportSnapshot["executiveSummary"],
  "verdict"
> & {
  verdict: ReportSnapshot["executiveSummary"]["verdict"] & {
    toneLabel: string;
  };
};

type ReportSectionViewModel = ReportSnapshot["sections"][number] & {
  toneLabel: string;
};

type ReportViewModel = {
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
  discountSimulationContext: ReportSnapshot["category"];
};

const toneLabels: Record<ReportTone, string> = {
  neutral: "Informação",
  positive: "Situação positiva",
  warning: "Ponto de atenção",
  critical: "Ação necessária",
};

function optionalCurrency(value: number | null): string {
  return value === null ? "Indisponível" : formatCurrency(value);
}

function optionalPercentage(value: number | null): string {
  return value === null ? "Indisponível" : formatBasisPoints(value);
}

function toServiceNumbers(
  snapshot: ServiceReportSnapshotV2,
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
      label: "Margem real",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
    },
    {
      key: "profit",
      label: `Lucro por ${unitLabel}`,
      value: optionalCurrency(snapshot.results.unitProfitCents),
    },
    {
      key: "minimum",
      label: "Preço mínimo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
    },
    {
      key: "target",
      label: "Preço-alvo (15%)",
      value: optionalCurrency(snapshot.results.targetPriceCents),
    },
  ];
}

function toProductNumbers(
  snapshot: ProductReportSnapshotV1,
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
      label: "Margem real",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
    },
    {
      key: "profit",
      label: partial ? "Contribuição por unidade" : "Lucro por unidade",
      value: optionalCurrency(
        partial
          ? snapshot.results.unitContributionCents
          : snapshot.results.unitProfitCents,
      ),
    },
    {
      key: "minimum",
      label: partial ? "Preço mínimo (sem rateio fixo)" : "Preço mínimo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
    },
    {
      key: "target",
      label: partial ? "Preço-alvo (sem rateio fixo)" : "Preço-alvo (20%)",
      value: optionalCurrency(snapshot.results.targetPriceCents),
    },
  ];
}

function toProductionNumbers(
  snapshot: ProductionReportSnapshotV1,
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
      label: "Margem real",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
    },
    {
      key: "profit",
      label: partial ? "Contribuição por unidade" : "Lucro por unidade",
      value: optionalCurrency(
        partial
          ? snapshot.results.unitContributionCents
          : snapshot.results.unitProfitCents,
      ),
    },
    {
      key: "minimum",
      label: partial ? "Preço mínimo (sem rateio fixo)" : "Preço mínimo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
    },
    {
      key: "target",
      label: partial ? "Preço-alvo (sem rateio fixo)" : "Preço-alvo (20%)",
      value: optionalCurrency(snapshot.results.targetPriceCents),
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
  let title: string;
  let categoryLabel: string;
  let numbers: ReportNumberViewModel[];

  switch (snapshot.category) {
    case "service":
      title = "Diagnóstico de Serviço";
      categoryLabel = "Serviço";
      numbers = toServiceNumbers(snapshot);
      break;
    case "product":
      title = "Diagnóstico de Produto";
      categoryLabel = "Produto";
      numbers = toProductNumbers(snapshot);
      break;
    case "production":
      title = "Diagnóstico de Produção";
      categoryLabel = "Produção";
      numbers = toProductionNumbers(snapshot);
      break;
  }

  return {
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
        toneLabel: toneLabels[snapshot.executiveSummary.verdict.tone],
      },
    },
    numbers,
    sections: snapshot.sections.map((section) => ({
      ...section,
      toneLabel: toneLabels[section.tone],
    })),
    discountSimulationBase: snapshot.discountSimulationBase,
    discountSimulationContext: snapshot.category,
  };
}

export {
  toReportViewModel,
  type ReportExecutiveSummaryViewModel,
  type ReportNumberViewModel,
  type ReportSectionViewModel,
  type ReportViewModel,
};
