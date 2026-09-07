import { formatBasisPoints, formatCurrency } from "../formatters";
import type {
  ProductReportCalculation,
  ProductReportPriority,
  ProductReportVerdict,
  ReportExecutiveSummary,
  ReportTone,
} from "../types";

const productVerdictContent: Record<
  ProductReportVerdict,
  { label: string; body: string; tone: ReportTone }
> = {
  direct_loss: {
    label: "Venda com prejuízo",
    body: "O valor recebido, depois das taxas, não paga o custo de compra. Vender mais nessas condições aumenta o prejuízo.",
    tone: "critical",
  },
  incomplete_volume: {
    label: "Falta informar as vendas",
    body: "A venda paga o custo do produto, mas falta informar quantas unidades você vende por mês para incluir os gastos mensais.",
    tone: "neutral",
  },
  operational_loss: {
    label: "Preço abaixo dos gastos",
    body: "A venda paga o custo de compra, mas não cobre a parte dos gastos mensais de cada unidade.",
    tone: "critical",
  },
  tight_margin: {
    label: "Abaixo da meta",
    body: "Cada unidade dá lucro, mas ainda sobra menos que a meta de 20%.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Meta alcançada",
    body: "O preço paga todos os gastos e alcança a meta de 20%. Agora mantenha a quantidade de vendas usada no cálculo.",
    tone: "positive",
  },
  above_target: {
    label: "Acima da meta",
    body: "O preço paga todos os gastos e passa da meta de 20%. Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
    tone: "positive",
  },
};

const productPriorityContent: Record<
  ProductReportPriority,
  { label: string; body: string }
> = {
  cost: {
    label: "Custo do produto",
    body: "O custo de compra usa todo o valor que sobra da venda. Tente reduzir esse custo ou aumentar o preço antes de vender mais.",
  },
  data: {
    label: "Quantidade de vendas",
    body: "Informe quantas unidades você vende por mês. Assim, conseguimos incluir os gastos mensais e mostrar quanto realmente sobra.",
  },
  price: {
    label: "Preço",
    body: "O preço não paga todos os gastos de uma unidade. Reveja o preço ou reduza os gastos.",
  },
  margin: {
    label: "Quanto sobra",
    body: "A venda dá lucro, mas ainda sobra menos que a meta de 20%. Reveja o preço e os gastos em conjunto.",
  },
  volume: {
    label: "Quantidade de vendas",
    body: "O preço alcança a meta. Agora mantenha a quantidade de vendas usada no cálculo.",
  },
};

function buildProductVerdict(
  calculation: ProductReportCalculation,
): ReportExecutiveSummary["verdict"] {
  return productVerdictContent[calculation.verdict];
}

function buildProductFacts(
  calculation: ProductReportCalculation,
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
      referenceValue: "20%",
    },
    {
      key: "price",
      currentLabel: "Preço atual",
      currentValue: formatCurrency(calculation.currentPriceCents),
      referenceLabel: calculation.priceReferencesPartial
        ? "Preço para a meta, sem gastos mensais"
        : "Preço para alcançar a meta",
      referenceValue:
        calculation.targetPriceCents === null
          ? "Indisponível"
          : formatCurrency(calculation.targetPriceCents),
    },
  ];
}

function buildProductPriority(
  calculation: ProductReportCalculation,
): ReportExecutiveSummary["priority"] {
  return productPriorityContent[calculation.priority];
}

function buildProductProfitabilityAnswer(
  calculation: ProductReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  let answer: string;

  if (calculation.verdict === "direct_loss") {
    answer = `Não — faltam ${formatCurrency(Math.abs(calculation.unitContributionCents))} por unidade para pagar os gastos considerados.`;
  } else if (calculation.verdict === "incomplete_volume") {
    answer =
      "Ainda não dá para saber quanto sobra de verdade. Informe quantas unidades você vende por mês para incluir os gastos mensais.";
  } else if (calculation.unitProfitCents === null) {
    answer = "Ainda não dá para calcular esse valor com os dados informados.";
  } else if (calculation.unitProfitCents < 0) {
    answer = `Não — faltam ${formatCurrency(Math.abs(calculation.unitProfitCents))} por unidade para pagar os gastos considerados.`;
  } else if (calculation.unitProfitCents === 0) {
    answer =
      "Não — o valor recebido apenas paga os gastos, sem deixar dinheiro.";
  } else {
    answer = `Sim — sobram ${formatCurrency(calculation.unitProfitCents)} por unidade depois de pagar os gastos considerados.`;
  }

  return {
    key: "profitability",
    question: "Estou ganhando dinheiro?",
    answer,
  };
}

function buildProductPriceAnswer(
  calculation: ProductReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  let answer: string;

  if (
    calculation.minimumPriceCents === null ||
    calculation.targetPriceCents === null
  ) {
    answer = "Ainda não dá para calcular esse valor com os dados informados.";
  } else if (calculation.priceReferencesPartial) {
    answer = `Ainda é uma estimativa: ${formatCurrency(calculation.targetPriceCents)} inclui o custo do produto e as taxas, mas não os gastos mensais.`;
  } else if (calculation.currentPriceCents < calculation.minimumPriceCents) {
    answer = `Não — para pagar todos os gastos, o preço precisa ser pelo menos ${formatCurrency(calculation.minimumPriceCents)}.`;
  } else if (calculation.currentPriceCents < calculation.targetPriceCents) {
    answer =
      "Quase — o preço paga os gastos, mas ainda não alcança a meta de 20%.";
  } else {
    answer = "Sim — seu preço alcança o valor calculado para a meta de 20%.";
  }

  return {
    key: "price_sufficiency",
    question: "Estou cobrando o preço certo?",
    answer,
  };
}

function buildProductImmediateActionAnswer(
  calculation: ProductReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  const actionByVerdict: Record<ProductReportVerdict, string> = {
    direct_loss:
      "Reduza o custo de compra ou aumente o preço antes de vender mais.",
    incomplete_volume:
      "Informe quantas unidades você vende por mês para concluir o diagnóstico.",
    operational_loss: "Aumente o preço ou reduza os gastos de cada unidade.",
    tight_margin: "Ajuste o preço ou os gastos para chegar à meta de 20%.",
    adequate_margin: "Mantenha a quantidade de vendas usada no cálculo.",
    above_target:
      "Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
  };

  return {
    key: "immediate_action",
    question: "O que preciso fazer agora?",
    answer: actionByVerdict[calculation.verdict],
  };
}

function buildProductExecutiveSummary(
  calculation: ProductReportCalculation,
): ReportExecutiveSummary {
  return {
    headline: "Seu produto dá lucro?",
    introduction:
      "Veja quanto sobra de cada venda e o que merece sua atenção primeiro.",
    verdict: buildProductVerdict(calculation),
    facts: buildProductFacts(calculation),
    priority: buildProductPriority(calculation),
    answers: [
      buildProductProfitabilityAnswer(calculation),
      buildProductPriceAnswer(calculation),
      buildProductImmediateActionAnswer(calculation),
    ],
  };
}

export { buildProductExecutiveSummary };
