import {
  formatBasisPoints,
  formatCurrency,
  formatReportDate,
  formatReportScenario,
  formatReportUnit,
} from "../formatters";
import type {
  ReportDiscountSimulationBase,
  ReportPriority,
  ReportSnapshot,
  ReportTone,
} from "../types";

type ReportMetricViewModel = {
  key: "price" | "margin" | "profit";
  label: string;
  value: string;
};

type ReportReferenceViewModel = {
  key: "minimum" | "target";
  label: string;
  value: string;
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
  summary: {
    verdict: {
      label: string;
      description: string;
      tone: ReportTone;
      toneLabel: string;
    };
    priority: { label: string; description: string };
    metrics: ReportMetricViewModel[];
  };
  priceReferences: ReportReferenceViewModel[];
  nextActions: string[];
  sections: ReportSectionViewModel[];
  discountSimulationBase: ReportDiscountSimulationBase;
};

const toneLabels: Record<ReportTone, string> = {
  neutral: "Informação",
  positive: "Situação positiva",
  warning: "Ponto de atenção",
  critical: "Ação necessária",
};

const priorityContent: Record<
  ReportPriority,
  { label: string; description: string; actions: [string, string] }
> = {
  cost: {
    label: "Custo",
    description: "Reduza o custo da operação antes de acelerar as vendas.",
    actions: [
      "Revise os custos que mais pressionam cada venda.",
      "Recalcule o preço depois de reduzir ou renegociar despesas.",
    ],
  },
  price: {
    label: "Preço",
    description: "Seu preço precisa sair do prejuízo antes de buscar escala.",
    actions: [
      "Corrija o preço antes de buscar mais volume.",
      "Use o preço mínimo como limite financeiro imediato.",
    ],
  },
  margin: {
    label: "Margem",
    description: "O preço cobre a operação, mas ainda não entrega a meta.",
    actions: [
      "Aproxime seu preço da margem-alvo de 15%.",
      "Combine ajuste de preço, custo e valor percebido.",
    ],
  },
  volume: {
    label: "Volume",
    description:
      "Seu preço se sustenta. Agora transforme a meta em rotina comercial.",
    actions: [
      "Use a meta mensal como referência para sua agenda.",
      "Acompanhe ocupação e recorrência antes de conceder descontos.",
    ],
  },
};

function optionalCurrency(value: number | null): string {
  return value === null ? "Indisponível" : formatCurrency(value);
}

function optionalPercentage(value: number | null): string {
  return value === null ? "Indisponível" : formatBasisPoints(value);
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
  const marginSection = snapshot.sections.find(
    ({ key }) => key === "margin_diagnosis",
  );
  if (!marginSection) throw new Error("missing_margin_section");

  const priority = priorityContent[snapshot.results.priority];
  const unitLabel = formatReportUnit(snapshot.unit);

  return {
    identity: {
      id,
      title: "Diagnóstico de Serviço",
      categoryLabel: "Serviço",
      scenarioLabel: formatReportScenario(snapshot.scenario),
      createdAtLabel: formatReportDate(createdAt),
      unitLabel,
    },
    summary: {
      verdict: {
        label: marginSection.emphasisValue ?? "Diagnóstico da margem",
        description: marginSection.body,
        tone: marginSection.tone,
        toneLabel: toneLabels[marginSection.tone],
      },
      priority: {
        label: priority.label,
        description: priority.description,
      },
      metrics: [
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
      ],
    },
    priceReferences: [
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
    ],
    nextActions: [...priority.actions],
    sections: snapshot.sections.map((section) => ({
      ...section,
      toneLabel: toneLabels[section.tone],
    })),
    discountSimulationBase: snapshot.discountSimulationBase,
  };
}

export {
  toReportViewModel,
  type ReportMetricViewModel,
  type ReportReferenceViewModel,
  type ReportSectionViewModel,
  type ReportViewModel,
};
