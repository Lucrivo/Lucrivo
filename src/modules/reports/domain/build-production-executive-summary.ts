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
    body: "As vendas pagam exatamente os valores considerados, sem sobra.",
    tone: "neutral",
  },
  positive_result: {
    label: "Resultado positivo",
    body: "O resultado estimado do mês ficou positivo.",
    tone: "positive",
  },
} as const;

function buildProductionExecutiveSummary(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary {
  const unknownVolume = calculation.monthlySalesVolumeUsed === null;
  const monthlyResult = calculation.monthlyResultCents;
  const action = {
    direct_loss:
      "Revise o preço, as cobranças da venda ou o custo de fabricação antes de buscar mais vendas.",
    incomplete_volume:
      "Use a quantidade mensal calculada no preço atual e informe seu volume quando souber.",
    no_sales:
      "Use a quantidade mensal calculada como referência para o próximo mês.",
    operational_loss:
      "Compare o menor preço com o preço atual e a quantidade necessária.",
    break_even:
      "Acompanhe preço, gastos e quantidade para decidir a próxima mudança.",
    positive_result:
      "Acompanhe o valor e a porcentagem que sobram com as informações atuais.",
  }[calculation.verdict];
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
      "Veja quanto cada unidade deixa para o mês e, quando há quantidade, quanto sobra depois de todos os valores considerados.",
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
    priority: { label: priorityLabel, body: action },
    answers: [
      {
        key: "profitability",
        question: "Quanto sobra com os valores informados?",
        answer:
          monthlyResult === null
            ? `O resultado do mês depende da quantidade. No preço atual, cada unidade deixa ${formatCurrency(calculation.unitContributionCents)} para pagar os gastos mensais.`
            : `O resultado estimado do mês é ${formatCurrency(monthlyResult)}.`,
      },
      {
        key: "price_sufficiency",
        question: "Qual é o menor preço completo?",
        answer:
          calculation.minimumPriceCents === null
            ? unknownVolume
              ? "Ainda não calculamos um menor preço completo porque falta uma quantidade para dividir os gastos do mês."
              : "Ainda não foi possível calcular um menor preço completo com os valores informados."
            : `O menor preço para não ficar no prejuízo é ${formatCurrency(calculation.minimumPriceCents)}.`,
      },
      {
        key: "immediate_action",
        question: "O que posso observar agora?",
        answer: action,
      },
    ],
  };
}

export { buildProductionExecutiveSummary };
