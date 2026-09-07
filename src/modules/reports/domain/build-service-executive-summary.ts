import {
  formatBasisPoints,
  formatCurrency,
  formatReportUnit,
} from "../formatters";
import type {
  ReportExecutiveSummary,
  ReportTone,
  ServiceReportPriority,
  ServiceReportVerdict,
} from "../types";
import type { ServiceReportCalculation } from "./calculate-service-report";

const verdictContent: Record<
  ServiceReportVerdict,
  { label: string; body: string; tone: ReportTone }
> = {
  missing_price: {
    label: "Informe o preço",
    body: "Informe quanto você cobra para comparar com seus gastos e a meta de 15%.",
    tone: "neutral",
  },
  direct_loss: {
    label: "Venda com prejuízo",
    body: "O valor recebido, depois das taxas, não paga nem os materiais usados no serviço. Fazer mais serviços nessas condições aumenta o prejuízo.",
    tone: "critical",
  },
  operational_loss: {
    label: "Preço abaixo dos gastos",
    body: "",
    tone: "critical",
  },
  tight_margin: {
    label: "Abaixo da meta",
    body: "O preço paga os gastos, mas ainda sobra menos que a meta de 15%.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Meta alcançada",
    body: "O preço paga os gastos e alcança a meta de 15%. Agora mantenha a quantidade de trabalho usada no cálculo.",
    tone: "positive",
  },
  above_target: {
    label: "Acima da meta",
    body: "O preço paga os gastos e passa da meta de 15%. Acompanhe se seus clientes aceitam o preço e mantenha a quantidade de trabalho.",
    tone: "positive",
  },
};

const priorityContent: Record<
  ServiceReportPriority,
  { label: string; body: string; action: string | null }
> = {
  cost: {
    label: "Gastos",
    body: "Os gastos estão deixando pouco dinheiro em cada venda. Comece pelos maiores e veja quais podem ser reduzidos.",
    action: "Revise os maiores gastos antes de buscar mais vendas.",
  },
  price: {
    label: "Preço",
    body: "Seu preço não paga todos os gastos. Reveja o valor cobrado antes de buscar mais vendas.",
    action: "Aumente o preço ou reduza os gastos antes de vender mais.",
  },
  margin: {
    label: "Quanto sobra",
    body: "O serviço dá lucro, mas ainda sobra menos que a meta de 15%. Reveja o preço e os gastos em conjunto.",
    action: "Ajuste o preço ou os gastos para chegar à meta de 15%.",
  },
  volume: {
    label: "Quantidade de serviços",
    body: "Seu preço alcança a meta. Agora mantenha a quantidade de trabalho usada no cálculo.",
    action: null,
  },
};

function buildVerdict(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["verdict"] {
  const content = verdictContent[calculation.verdict];
  if (
    calculation.verdict !== "operational_loss" &&
    calculation.verdict !== "direct_loss"
  ) {
    return content;
  }

  if (calculation.verdict === "direct_loss") return content;

  const unit = formatReportUnit(calculation.unit);
  return {
    ...content,
    body: `O preço não paga todos os gastos. Do jeito que está, cada ${unit} deixa o negócio no prejuízo.`,
  };
}

function buildFacts(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["facts"] {
  return [
    {
      key: "margin",
      currentLabel: "Quanto sobra a cada R$ 100",
      currentValue:
        calculation.realMarginBasisPoints === null
          ? "Indisponível"
          : formatBasisPoints(calculation.realMarginBasisPoints),
      referenceLabel: "Meta",
      referenceValue: "15%",
    },
    {
      key: "price",
      currentLabel: "Preço atual",
      currentValue: formatCurrency(calculation.currentPriceCents),
      referenceLabel: "Preço para alcançar a meta",
      referenceValue:
        calculation.targetPriceCents === null
          ? "Indisponível"
          : formatCurrency(calculation.targetPriceCents),
    },
  ];
}

function buildPriority(
  priority: ServiceReportPriority,
): ReportExecutiveSummary["priority"] {
  const { label, body } = priorityContent[priority];
  return { label, body };
}

function buildProfitabilityAnswer(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  const unit = formatReportUnit(calculation.unit);
  let answer: string;

  if (calculation.verdict === "missing_price") {
    answer = "Ainda não dá para calcular esse valor com os dados informados.";
  } else if (calculation.unitProfitCents === null) {
    answer = "Ainda não dá para calcular esse valor com os dados informados.";
  } else if (calculation.unitProfitCents < 0) {
    answer = `Não — faltam ${formatCurrency(Math.abs(calculation.unitProfitCents))} por ${unit} para pagar os gastos considerados.`;
  } else if (calculation.unitProfitCents === 0) {
    answer =
      "Não — o valor recebido apenas paga os gastos, sem deixar dinheiro.";
  } else {
    answer = `Sim — sobram ${formatCurrency(calculation.unitProfitCents)} por ${unit} depois de pagar os gastos considerados.`;
  }

  return {
    key: "profitability",
    question: "Estou ganhando dinheiro?",
    answer,
  };
}

function buildPriceSufficiencyAnswer(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  let answer: string;

  if (
    calculation.verdict === "missing_price" ||
    calculation.currentPriceCents <= 0
  ) {
    answer = "Ainda não — informe o preço atual para fazer a comparação.";
  } else if (
    calculation.minimumPriceCents === null ||
    calculation.targetPriceCents === null
  ) {
    answer = "Ainda não dá para calcular esse valor com os dados informados.";
  } else if (calculation.currentPriceCents < calculation.minimumPriceCents) {
    answer = `Não — para pagar todos os gastos, o preço precisa ser pelo menos ${formatCurrency(calculation.minimumPriceCents)}.`;
  } else if (calculation.currentPriceCents < calculation.targetPriceCents) {
    answer =
      "Quase — o preço paga os gastos, mas ainda não alcança a meta de 15%.";
  } else {
    answer = "Sim — seu preço alcança o valor calculado para a meta de 15%.";
  }

  return {
    key: "price_sufficiency",
    question: "Estou cobrando o preço certo?",
    answer,
  };
}

function buildImmediateActionAnswer(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  const action = priorityContent[calculation.priority].action;
  const unit = calculation.unit === "hour" ? "horas" : "atendimentos";

  return {
    key: "immediate_action",
    question: "O que preciso fazer agora?",
    answer:
      action ??
      `Mantenha a quantidade de ${unit} usada no cálculo e acompanhe se seus clientes aceitam o preço.`,
  };
}

function buildServiceExecutiveSummary(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary {
  return {
    headline: "Seu serviço dá lucro?",
    introduction:
      "Veja quanto sobra do valor cobrado e o que merece sua atenção primeiro.",
    verdict: buildVerdict(calculation),
    facts: buildFacts(calculation),
    priority: buildPriority(calculation.priority),
    answers: [
      buildProfitabilityAnswer(calculation),
      buildPriceSufficiencyAnswer(calculation),
      buildImmediateActionAnswer(calculation),
    ],
  };
}

export { buildServiceExecutiveSummary };
