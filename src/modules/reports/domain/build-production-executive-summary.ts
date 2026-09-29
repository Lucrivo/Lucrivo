import { formatBasisPoints, formatCurrency } from "../formatters";
import type {
  ProductionReportCalculation,
  ReportExecutiveSummary,
} from "../types";

const verdictContent = {
  direct_loss: {
    label: "Prejuízo por venda",
    body: "Cada unidade vendida deixa um valor negativo antes dos gastos mensais.",
    tone: "critical",
  },
  incomplete_volume: {
    label: "Falta informar as vendas",
    body: "A quantidade do mês ainda não foi informada.",
    tone: "neutral",
  },
  no_sales: {
    label: "Sem vendas no mês",
    body: "O mês informado teve volume zero e manteve os gastos mensais.",
    tone: "neutral",
  },
  operational_loss: {
    label: "Prejuízo no mês",
    body: "O resultado estimado do mês ficou negativo.",
    tone: "critical",
  },
  break_even: {
    label: "Ponto de equilíbrio",
    body: "As vendas pagam exatamente os valores considerados, sem lucro nem prejuízo.",
    tone: "neutral",
  },
  positive_result: {
    label: "Resultado positivo",
    body: "O resultado estimado do mês ficou positivo.",
    tone: "positive",
  },
} as const;
function profitabilityAnswer(calculation: ProductionReportCalculation): string {
  const result = calculation.monthlyResultCents;
  const contribution = calculation.unitContributionCents;

  if (calculation.verdict === "direct_loss") {
    const unitLoss = formatCurrency(Math.abs(contribution));
    if (result === null) {
      return `Ainda não dá para calcular se há lucro no mês, mas cada unidade vendida perde ${unitLoss} antes dos gastos mensais.`;
    }
    if (calculation.monthlySalesVolumeUsed === 0) {
      return result < 0
        ? `Não. Sem unidades vendidas, o prejuízo estimado do mês é de ${formatCurrency(Math.abs(result))}. Além disso, cada futura venda perderia ${unitLoss} antes dos gastos mensais.`
        : `Ainda não houve unidades vendidas no mês. No preço atual, cada futura venda perderia ${unitLoss} antes dos gastos mensais.`;
    }
    return `Não. O prejuízo estimado do mês é de ${formatCurrency(Math.abs(result))}. Cada unidade vendida perde ${unitLoss} antes dos gastos mensais.`;
  }

  if (calculation.verdict === "incomplete_volume") {
    return `Ainda não dá para calcular se há lucro no mês. No preço atual, cada unidade deixa ${formatCurrency(contribution)} para ajudar a pagar os gastos mensais.`;
  }

  if (calculation.verdict === "no_sales") {
    return result !== null && result < 0
      ? `Ainda não houve unidades vendidas no mês. Com os gastos informados, o prejuízo estimado é de ${formatCurrency(Math.abs(result))}.`
      : "Ainda não houve unidades vendidas no mês, e o resultado ficou em R$ 0,00.";
  }

  if (calculation.verdict === "operational_loss") {
    return `Não. O prejuízo estimado do mês é de ${formatCurrency(Math.abs(result ?? 0))}.`;
  }

  if (calculation.verdict === "break_even") {
    return "Ainda não. Não há lucro nem prejuízo: as vendas pagam exatamente os valores considerados.";
  }

  return `Sim. Seu lucro estimado no mês é de ${formatCurrency(result ?? 0)}, depois dos valores considerados.`;
}

function priceSufficiencyAnswer(
  calculation: ProductionReportCalculation,
): string {
  if (calculation.verdict === "direct_loss") {
    return "Não. O preço atual não cobre o custo de fabricação e as cobranças da venda.";
  }
  if (calculation.verdict === "incomplete_volume") {
    return "Ainda não dá para confirmar. Falta uma quantidade para distribuir os gastos mensais e calcular o preço completo.";
  }
  if (calculation.verdict === "no_sales") {
    return "Ainda não dá para confirmar com o mês informado, porque não houve vendas.";
  }
  if (calculation.minimumPriceCents === null) {
    return "Ainda não dá para calcular o preço completo com os valores informados.";
  }
  if (calculation.verdict === "operational_loss") {
    return `Não. Para a quantidade informada, o preço precisaria ser pelo menos ${formatCurrency(calculation.minimumPriceCents)}.`;
  }
  if (calculation.verdict === "break_even") {
    return "Sim, exatamente. O preço paga os custos e gastos considerados, sem gerar lucro nem prejuízo.";
  }
  return "Sim. Com a quantidade informada, o preço paga os custos e gastos considerados.";
}

function buildProductionExecutiveSummary(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary {
  const monthlyResult = calculation.monthlyResultCents;
  const priorityBody = {
    direct_loss:
      "Revise primeiro o preço, as cobranças da venda e o custo de fabricação.",
    incomplete_volume:
      "Informe a quantidade vendida para completar o resultado mensal.",
    no_sales: "Use a quantidade necessária como referência para o próximo mês.",
    operational_loss:
      "Revise primeiro o preço e os gastos considerados no mês.",
    break_even: "Crie uma pequena folga entre o preço, os gastos e as vendas.",
    positive_result: "Acompanhe o resultado e preserve as condições atuais.",
  }[calculation.verdict];
  const action = {
    direct_loss:
      "Revise o preço, as cobranças da venda ou o custo de fabricação antes de vender mais.",
    incomplete_volume:
      "Informe quantas unidades costuma vender no mês para completar o resultado.",
    no_sales:
      "Use a quantidade necessária abaixo como primeira referência para o próximo mês.",
    operational_loss:
      "Compare o preço atual com o menor preço sem prejuízo e com a quantidade necessária.",
    break_even:
      "Busque uma pequena folga no preço, nos gastos ou na quantidade vendida.",
    positive_result:
      "Acompanhe o lucro, quanto ele representa a cada R$ 100 e a quantidade vendida.",
  }[calculation.verdict];
  const profitability = profitabilityAnswer(calculation);
  const priceAnswer = priceSufficiencyAnswer(calculation);
  const priorityLabel = {
    cost: "Custo de fabricação",
    data: "Quantidade vendida",
    price: "Preço e gastos",
    margin: "Resultado",
    volume: "Unidades vendidas",
  }[calculation.priority];

  return {
    headline: "Resultado das suas unidades produzidas",
    introduction:
      "Veja quanto cada unidade deixa para o mês e, quando há quantidade, qual é o resultado depois de todos os valores considerados.",
    verdict: verdictContent[calculation.verdict],
    facts: [
      {
        key: "margin",
        currentLabel: "Resultado do mês",
        currentValue:
          monthlyResult === null
            ? "Ainda não calculado"
            : formatCurrency(monthlyResult),
        referenceLabel: "Quanto sobra a cada R$ 100",
        referenceValue:
          calculation.realMarginBasisPoints === null
            ? "Ainda não calculado"
            : formatBasisPoints(calculation.realMarginBasisPoints),
      },
      {
        key: "price",
        currentLabel: "Preço atual",
        currentValue: formatCurrency(calculation.currentPriceCents),
        referenceLabel: "Menor preço para não ficar no prejuízo",
        referenceValue:
          calculation.minimumPriceCents === null
            ? "Ainda não calculado"
            : formatCurrency(calculation.minimumPriceCents),
      },
    ],
    priority: { label: priorityLabel, body: priorityBody },
    answers: [
      {
        key: "profitability",
        question: "Estou ganhando dinheiro?",
        answer: profitability,
      },
      {
        key: "price_sufficiency",
        question: "Meu preço paga todos os gastos?",
        answer: priceAnswer,
      },
      {
        key: "immediate_action",
        question: "O que preciso fazer agora?",
        answer: action,
      },
    ],
  };
}

export { buildProductionExecutiveSummary };
