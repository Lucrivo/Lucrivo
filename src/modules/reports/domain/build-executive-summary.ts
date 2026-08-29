import {
  formatBasisPoints,
  formatCurrency,
  formatReportUnit,
} from "../formatters";
import type {
  ReportExecutiveSummary,
  ReportPriority,
  ReportTone,
  ReportVerdict,
} from "../types";
import type { ServiceReportCalculation } from "./calculate-service-report";

const verdictContent: Record<
  ReportVerdict,
  { label: string; body: string; tone: ReportTone }
> = {
  missing_price: {
    label: "Informe o preço",
    body: "Informe o preço atual para o Lucrivo comparar sua cobrança com os custos e a meta de 15%.",
    tone: "neutral",
  },
  operational_loss: {
    label: "Prejuízo",
    body: "",
    tone: "critical",
  },
  tight_margin: {
    label: "Margem apertada",
    body: "O preço cobre os custos, mas a margem ainda está abaixo da meta de 15%. Existe lucro, porém com menos espaço do que o planejado.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Margem adequada",
    body: "O preço cobre os custos e alcança a meta financeira de 15%. Agora o resultado depende de manter o volume necessário.",
    tone: "positive",
  },
  above_target: {
    label: "Acima da meta",
    body: "O preço cobre os custos e supera a meta financeira de 15%. Há folga na margem; confirme se o mercado aceita esse preço e acompanhe o volume.",
    tone: "positive",
  },
};

const priorityContent: Record<
  ReportPriority,
  { label: string; body: string; action: string }
> = {
  cost: {
    label: "Custo",
    body: "Os custos pressionam cada venda. Reduza ou renegocie os maiores gastos antes de acelerar o volume.",
    action: "Revise os custos antes de acelerar as vendas.",
  },
  price: {
    label: "Preço",
    body: "Seu preço está abaixo do necessário para cobrir a operação. O ajuste começa no preço.",
    action: "Ajuste o preço antes de buscar mais volume.",
  },
  margin: {
    label: "Margem",
    body: "A operação gera lucro, mas ainda não alcança a meta. Combine preço, custo e valor percebido.",
    action: "Aproxime a operação da meta financeira de 15%.",
  },
  volume: {
    label: "Volume",
    body: "Seu preço sustenta a operação e a meta. Agora transforme o volume necessário em rotina comercial.",
    action: "Trabalhe para alcançar a meta de vendas calculada.",
  },
};

function buildVerdict(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["verdict"] {
  const content = verdictContent[calculation.verdict];
  if (calculation.verdict !== "operational_loss") return content;

  const unit = formatReportUnit(calculation.unit);
  return {
    ...content,
    body: `O preço não cobre todos os custos necessários. Do jeito que está, cada ${unit} ainda deixa a conta no vermelho — o ajuste é no preço ou no custo.`,
  };
}

function buildFacts(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["facts"] {
  return [
    {
      key: "margin",
      currentLabel: "Margem atual",
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
      referenceLabel: "Preço-alvo",
      referenceValue:
        calculation.targetPriceCents === null
          ? "Indisponível"
          : formatCurrency(calculation.targetPriceCents),
    },
  ];
}

function buildPriority(
  priority: ReportPriority,
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
    answer = "Ainda não é possível responder sem o preço atual.";
  } else if (calculation.unitProfitCents === null) {
    answer = `Ainda não é possível calcular o lucro por ${unit} com os dados informados.`;
  } else if (calculation.unitProfitCents < 0) {
    answer = `Não — hoje cada ${unit} fecha no vermelho em ${formatCurrency(Math.abs(calculation.unitProfitCents))}.`;
  } else if (calculation.unitProfitCents === 0) {
    answer = `Não — cada ${unit} apenas cobre os custos, sem gerar lucro.`;
  } else {
    answer = `Sim — cada ${unit} deixa ${formatCurrency(calculation.unitProfitCents)} após os custos considerados.`;
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
    answer =
      "Ainda não é possível calcular uma referência financeira segura com os dados informados.";
  } else if (calculation.currentPriceCents < calculation.minimumPriceCents) {
    answer = `Não — está abaixo do mínimo financeiro de ${formatCurrency(calculation.minimumPriceCents)}.`;
  } else if (calculation.currentPriceCents < calculation.targetPriceCents) {
    answer =
      "Parcialmente — cobre os custos, mas ainda não alcança a meta de 15%.";
  } else {
    answer = "Sim — alcança a referência financeira para a meta de 15%.";
  }

  return {
    key: "price_sufficiency",
    question: "Estou cobrando o preço certo?",
    answer,
  };
}

function buildImmediateActionAnswer(
  priority: ReportPriority,
): ReportExecutiveSummary["answers"][number] {
  return {
    key: "immediate_action",
    question: "O que preciso fazer agora?",
    answer: priorityContent[priority].action,
  };
}

function buildExecutiveSummary(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary {
  return {
    headline: "A verdade por trás do preço.",
    introduction:
      "O Lucrivo revela o que está escondido nos seus números e mostra exatamente o que fazer a respeito.",
    verdict: buildVerdict(calculation),
    facts: buildFacts(calculation),
    priority: buildPriority(calculation.priority),
    answers: [
      buildProfitabilityAnswer(calculation),
      buildPriceSufficiencyAnswer(calculation),
      buildImmediateActionAnswer(calculation.priority),
    ],
  };
}

export { buildExecutiveSummary };
