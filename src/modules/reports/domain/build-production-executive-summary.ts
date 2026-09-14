import { formatBasisPoints, formatCurrency } from "../formatters";
import type {
  ProductionReportCalculation,
  ReportExecutiveSummary,
} from "../types";

const verdictContent = {
  direct_loss: {
    label: "Prejuízo por venda",
    body: "Cada unidade vendida deixa um valor negativo antes mesmo dos gastos mensais.",
    tone: "critical",
  },
  operational_loss: {
    label: "Prejuízo no mês",
    body: "O resultado do mês ficou negativo com as unidades vendidas e os gastos informados.",
    tone: "critical",
  },
  no_sales: {
    label: "Sem vendas no mês",
    body: "O mês foi calculado sem unidades vendidas e sem gastos mensais.",
    tone: "neutral",
  },
  break_even: {
    label: "No limite",
    body: "As unidades vendidas pagam exatamente os gastos informados, sem deixar sobra.",
    tone: "warning",
  },
  tight_margin: {
    label: "Margem apertada",
    body: "O mês terminou positivo, mas com pouca folga para imprevistos.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Lucro",
    body: "O mês terminou positivo com as unidades vendidas e os gastos informados.",
    tone: "positive",
  },
  incomplete_volume: {
    label: "Sem vendas no mês",
    body: "O mês foi calculado sem unidades vendidas.",
    tone: "neutral",
  },
  above_target: {
    label: "Lucro",
    body: "O mês terminou positivo.",
    tone: "positive",
  },
} as const;

function buildProductionExecutiveSummary(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary {
  const noVolume = calculation.monthlySalesVolumeUsed === 0;
  const action = {
    direct_loss:
      "Revise o preço, as cobranças da venda ou o custo de fabricação antes de vender mais.",
    operational_loss: noVolume
      ? "Comece pelas unidades que precisam ser vendidas para pagar os gastos mensais."
      : "Revise primeiro o preço e os gastos do mês.",
    no_sales:
      "Use a quantidade necessária abaixo como primeira referência de vendas.",
    break_even: "Busque uma pequena folga no preço, nos gastos ou nas vendas.",
    tight_margin: "Proteja a pouca folga revendo preço e gastos.",
    adequate_margin: "Acompanhe o resultado e preserve as condições atuais.",
    incomplete_volume: "Informe as unidades vendidas.",
    above_target: "Acompanhe o resultado.",
  }[calculation.verdict];
  const profitability = noVolume
    ? calculation.monthlyResultCents < 0
      ? `Não neste mês — sem unidades vendidas, o resultado foi ${formatCurrency(calculation.monthlyResultCents)}. Uma futura unidade vendida deixa ${formatCurrency(calculation.unitContributionCents)} para pagar os gastos mensais.`
      : `Ainda não houve unidades vendidas no mês. Uma futura unidade vendida deixa ${formatCurrency(calculation.unitContributionCents)} para pagar os gastos mensais.`
    : calculation.monthlyResultCents > 0
      ? `Sim — o resultado do mês foi ${formatCurrency(calculation.monthlyResultCents)}.`
      : calculation.monthlyResultCents === 0
        ? "Ainda não — as vendas pagaram exatamente os gastos do mês."
        : `Não — o resultado do mês foi ${formatCurrency(calculation.monthlyResultCents)}.`;
  const priceAnswer =
    calculation.minimumPriceCents === null
      ? "Ainda não é possível calcular um menor preço com as porcentagens informadas."
      : noVolume
        ? `O menor preço de ${formatCurrency(calculation.minimumPriceCents)} evita prejuízo direto e considera o custo de fabricação. Os gastos mensais dependem da quantidade mostrada abaixo.`
        : calculation.currentPriceCents >= calculation.minimumPriceCents
          ? `Sim — o preço atual está acima do menor preço de ${formatCurrency(calculation.minimumPriceCents)} que paga os gastos informados.`
          : `Não — o preço precisa ser pelo menos ${formatCurrency(calculation.minimumPriceCents)} para pagar os gastos informados.`;
  const priority =
    calculation.priority === "cost"
      ? { label: "Custo de fabricação", body: action }
      : calculation.priority === "price"
        ? { label: "Preço e gastos", body: action }
        : calculation.priority === "margin"
          ? { label: "Folga do resultado", body: action }
          : { label: "Unidades vendidas", body: action };

  return {
    headline: "Sua produção dá lucro?",
    introduction:
      "Veja o resultado do mês, as unidades vendidas, o custo de fabricação, o menor preço e o primeiro ponto que merece atenção.",
    verdict: verdictContent[calculation.verdict],
    facts: [
      {
        key: "margin",
        currentLabel: "Resultado do mês",
        currentValue: formatCurrency(calculation.monthlyResultCents),
        referenceLabel: "Quanto sobra a cada R$ 100",
        referenceValue:
          calculation.realMarginBasisPoints === null
            ? "Sem vendas para calcular"
            : formatBasisPoints(calculation.realMarginBasisPoints),
      },
      {
        key: "price",
        currentLabel: "Preço atual",
        currentValue: formatCurrency(calculation.currentPriceCents),
        referenceLabel: noVolume
          ? "Menor preço antes dos gastos mensais"
          : "Menor preço sem prejuízo",
        referenceValue:
          calculation.minimumPriceCents === null
            ? "Indisponível"
            : formatCurrency(calculation.minimumPriceCents),
      },
    ],
    priority,
    answers: [
      {
        key: "profitability",
        question: "Estou ganhando dinheiro?",
        answer: profitability,
      },
      {
        key: "price_sufficiency",
        question: "Meu preço paga tudo?",
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
