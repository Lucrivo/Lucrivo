import { formatBasisPoints, formatCurrency } from "../formatters";
import type {
  ProductionReportCalculation,
  ProductionReportPriority,
  ProductionReportVerdict,
  ReportExecutiveSummary,
  ReportTone,
} from "../types";

const productionVerdictContent: Record<
  ProductionReportVerdict,
  { label: string; body: string; tone: ReportTone }
> = {
  direct_loss: {
    label: "Prejuízo direto",
    body: "A receita líquida da venda não cobre o custo de fabricação. Cada nova unidade vendida repete essa perda antes mesmo dos custos fixos.",
    tone: "critical",
  },
  incomplete_volume: {
    label: "Complete o diagnóstico",
    body: "A contribuição por unidade é positiva, mas os custos fixos e o pró-labore ainda não foram rateados porque falta o volume médio mensal.",
    tone: "neutral",
  },
  operational_loss: {
    label: "Prejuízo operacional",
    body: "A venda cobre o custo de fabricação, mas não cobre todo o custo operacional alocado à unidade.",
    tone: "critical",
  },
  tight_margin: {
    label: "Margem apertada",
    body: "A produção gera lucro por unidade, mas a margem real ainda está abaixo da meta financeira de 20%.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Margem adequada",
    body: "A produção cobre seus custos e alcança a meta financeira de 20%. O resultado depende de manter o volume necessário.",
    tone: "positive",
  },
  above_target: {
    label: "Acima da meta",
    body: "A produção cobre seus custos e supera a meta financeira de 20%. Valide a aceitação do mercado e preserve o volume.",
    tone: "positive",
  },
};

const productionPriorityContent: Record<
  ProductionReportPriority,
  { label: string; body: string }
> = {
  cost: {
    label: "Custo",
    body: "O custo de fabricação consome toda a receita líquida da venda. Corrija essa relação antes de pensar em volume.",
  },
  data: {
    label: "Dados",
    body: "Informe o volume médio mensal para ratear os custos fixos e descobrir o lucro e a margem reais.",
  },
  price: {
    label: "Preço",
    body: "O preço não cobre toda a operação alocada à unidade. Corrija o preço ou o custo operacional.",
  },
  margin: {
    label: "Margem",
    body: "Existe lucro, mas falta espaço até a meta de 20%. Trabalhe preço e custos em conjunto.",
  },
  volume: {
    label: "Volume",
    body: "Preço e margem sustentam a operação. Mantenha o volume necessário e acompanhe a aceitação do mercado.",
  },
};

function buildProductionVerdict(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary["verdict"] {
  return productionVerdictContent[calculation.verdict];
}

function buildProductionFacts(
  calculation: ProductionReportCalculation,
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
      referenceValue: "20%",
    },
    {
      key: "price",
      currentLabel: "Preço atual",
      currentValue: formatCurrency(calculation.currentPriceCents),
      referenceLabel: calculation.priceReferencesPartial
        ? "Preço-alvo sem rateio fixo"
        : "Preço-alvo",
      referenceValue:
        calculation.targetPriceCents === null
          ? "Indisponível"
          : formatCurrency(calculation.targetPriceCents),
    },
  ];
}

function buildProductionPriority(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary["priority"] {
  return productionPriorityContent[calculation.priority];
}

function buildProductionProfitabilityAnswer(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  let answer: string;

  if (calculation.verdict === "direct_loss") {
    answer = `Não — a contribuição por unidade é ${formatCurrency(calculation.unitContributionCents)} e não cobre o custo de fabricação.`;
  } else if (calculation.verdict === "incomplete_volume") {
    answer = `Ainda não é possível afirmar o lucro real: a contribuição por unidade é positiva em ${formatCurrency(calculation.unitContributionCents)}, mas falta ratear os custos fixos.`;
  } else if (calculation.unitProfitCents === null) {
    answer = "Ainda não é possível calcular o lucro por unidade.";
  } else if (calculation.unitProfitCents < 0) {
    answer = `Não — o prejuízo por unidade é ${formatCurrency(Math.abs(calculation.unitProfitCents))}.`;
  } else if (calculation.unitProfitCents === 0) {
    answer = "Não — a unidade apenas cobre os custos, sem gerar lucro.";
  } else {
    answer = `Sim — o lucro por unidade é ${formatCurrency(calculation.unitProfitCents)} após os custos considerados.`;
  }

  return {
    key: "profitability",
    question: "Estou ganhando dinheiro?",
    answer,
  };
}

function buildProductionPriceAnswer(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  let answer: string;

  if (
    calculation.minimumPriceCents === null ||
    calculation.targetPriceCents === null
  ) {
    answer =
      "Ainda não é possível calcular uma referência financeira segura com as taxas informadas.";
  } else if (calculation.priceReferencesPartial) {
    answer = `A referência ainda é parcial: ${formatCurrency(calculation.targetPriceCents)} considera o custo de fabricação e as taxas, mas ainda não inclui o rateio fixo.`;
  } else if (calculation.currentPriceCents < calculation.minimumPriceCents) {
    answer = `Não — está abaixo do mínimo financeiro de ${formatCurrency(calculation.minimumPriceCents)}.`;
  } else if (calculation.currentPriceCents < calculation.targetPriceCents) {
    answer =
      "Parcialmente — cobre os custos, mas ainda não alcança a meta de 20%.";
  } else {
    answer = "Sim — alcança a referência financeira para a meta de 20%.";
  }

  return {
    key: "price_sufficiency",
    question: "Estou cobrando o preço certo?",
    answer,
  };
}

function buildProductionImmediateActionAnswer(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  const actionByVerdict: Record<ProductionReportVerdict, string> = {
    direct_loss:
      "Revise o custo de fabricação ou aumente o preço antes de buscar volume.",
    incomplete_volume:
      "Informe o volume médio mensal para concluir o diagnóstico.",
    operational_loss:
      "Corrija o preço ou o custo operacional rateado antes de avançar.",
    tight_margin: "Aproxime preço e custo da meta financeira de 20%.",
    adequate_margin:
      "Mantenha o volume de vendas necessário para sustentar o resultado.",
    above_target:
      "Valide a aceitação do mercado e mantenha o volume de vendas.",
  };

  return {
    key: "immediate_action",
    question: "O que preciso fazer agora?",
    answer: actionByVerdict[calculation.verdict],
  };
}

function buildProductionExecutiveSummary(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary {
  return {
    headline: "A verdade por trás do preço da sua produção.",
    introduction:
      "O Lucrivo mostra o que cada venda fabricada deixa após o custo de fabricação, como os custos fixos afetam a unidade e qual ajuste merece prioridade.",
    verdict: buildProductionVerdict(calculation),
    facts: buildProductionFacts(calculation),
    priority: buildProductionPriority(calculation),
    answers: [
      buildProductionProfitabilityAnswer(calculation),
      buildProductionPriceAnswer(calculation),
      buildProductionImmediateActionAnswer(calculation),
    ],
  };
}

export { buildProductionExecutiveSummary };
