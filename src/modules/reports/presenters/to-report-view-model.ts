import {
  formatBasisPoints,
  formatCurrency,
  formatReportDate,
  formatReportScenario,
  formatReportUnit,
} from "../formatters";
import type {
  ProductReportSnapshotV1,
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
      label: partial
        ? "Preço-alvo (sem rateio fixo)"
        : "Preço-alvo (20%)",
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
  const isProduct = snapshot.category === "product";

  return {
    identity: {
      id,
      title: isProduct
        ? "Diagnóstico de Produto"
        : "Diagnóstico de Serviço",
      categoryLabel: isProduct ? "Produto" : "Serviço",
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
    numbers: isProduct
      ? toProductNumbers(snapshot)
      : toServiceNumbers(snapshot),
    sections: snapshot.sections.map((section) => ({
      ...section,
      toneLabel: toneLabels[section.tone],
    })),
    discountSimulationBase: snapshot.discountSimulationBase,
  };
}

export {
  toReportViewModel,
  type ReportExecutiveSummaryViewModel,
  type ReportNumberViewModel,
  type ReportSectionViewModel,
  type ReportViewModel,
};
