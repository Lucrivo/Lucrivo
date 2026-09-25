import type {
  DetailedDiagnosisCalculation,
  DetailedDiagnosisCommand,
} from "@/modules/detailed-diagnosis/types";

import { formatBasisPoints, formatCurrency } from "../formatters";
import type { ReportExecutiveSummary, ReportSection } from "../types";

type DetailedReportContent = {
  executiveSummary: ReportExecutiveSummary;
  sections: [ReportSection, ReportSection, ReportSection, ReportSection];
};

function optionalCurrency(value: number | null): string {
  return value === null ? "Ainda não calculado" : formatCurrency(value);
}

function verdictContent(
  calculation: DetailedDiagnosisCalculation,
): ReportExecutiveSummary["verdict"] {
  return {
    direct_loss: {
      label: "Prejuízo por venda",
      body: "Há itens que deixam um valor negativo antes mesmo dos gastos mensais.",
      tone: "critical",
    },
    incomplete_volume: {
      label: "Falta informar as vendas",
      body: "O resultado mensal ainda não foi calculado porque faltam vendas de um ou mais itens.",
      tone: "neutral",
    },
    no_sales: {
      label: "Sem vendas no mês",
      body: "O mês foi calculado sem vendas; os gastos mensais continuam considerados.",
      tone: "neutral",
    },
    operational_loss: {
      label: "Prejuízo no mês",
      body: "O resultado do mês ficou negativo com as vendas e os gastos informados.",
      tone: "critical",
    },
    break_even: {
      label: "No limite",
      body: "As vendas do mês pagam exatamente os gastos informados, sem deixar sobra.",
      tone: "warning",
    },
    tight_margin: {
      label: "Margem apertada",
      body: "O mês terminou positivo, mas com pouca folga para imprevistos.",
      tone: "warning",
    },
    adequate_margin: {
      label: "Lucro",
      body: "O mês terminou positivo com as vendas e os gastos informados.",
      tone: "positive",
    },
  }[calculation.verdict];
}

function immediateAction(calculation: DetailedDiagnosisCalculation): string {
  return {
    direct_loss:
      "Revise primeiro os preços e os gastos das vendas que geram perda.",
    incomplete_volume:
      "Informe as vendas de todos os itens para completar o resultado mensal.",
    no_sales: "Use o faturamento necessário abaixo como referência inicial.",
    operational_loss: "Revise primeiro os preços, custos e gastos do mês.",
    break_even: "Busque uma pequena folga nos preços, gastos ou vendas.",
    tight_margin: "Proteja a pouca folga revendo preços e gastos.",
    adequate_margin: "Acompanhe o resultado e preserve as condições atuais.",
  }[calculation.verdict];
}

function priorityContent(
  calculation: DetailedDiagnosisCalculation,
): ReportExecutiveSummary["priority"] {
  const body = immediateAction(calculation);
  const label = {
    cost: "Custos dos itens",
    data: "Dados de vendas",
    price: "Preços e gastos",
    margin: "Folga do resultado",
    volume: "Faturamento do mês",
  }[calculation.priority];
  return { label, body };
}

function minimumPriceSection(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): ReportSection {
  const inputById = new Map(command.items.map((item) => [item.id, item]));
  const values = calculation.items.map((result) => {
    const name = inputById.get(result.itemId)?.name ?? "Item";
    const value =
      result.breakEvenUnitPriceCents === null
        ? "indisponível"
        : formatCurrency(result.breakEvenUnitPriceCents);
    return `${name}: ${value}`;
  });
  return {
    key: "break_even",
    title: "Seus menores preços sem prejuízo",
    body: `Cada valor cobre os gastos da própria venda. Os gastos mensais permanecem no resultado geral. ${values.join(" · ")}`,
    emphasisLabel: "Itens analisados",
    emphasisValue: String(values.length),
    tone: calculation.items.some((item) => item.directLoss)
      ? "critical"
      : "neutral",
  };
}

function saleSection(calculation: DetailedDiagnosisCalculation): ReportSection {
  if (calculation.isPartial)
    return {
      key: "hidden_cost",
      title: "O que sai das vendas",
      body: "Os custos e as cobranças de cada venda já aparecem item por item. Falta informar as vendas de todos os itens para somar o mês sem apresentar um total parcial como resultado do negócio.",
      emphasisLabel: "Total do mês",
      emphasisValue: "Ainda não calculado",
      tone: calculation.items.some((item) => item.directLoss)
        ? "critical"
        : "neutral",
    };
  return {
    key: "hidden_cost",
    title: "O que sai das vendas",
    body: `No mês, impostos e cartão retiram ${formatCurrency(calculation.monthlyFeeAmountCents ?? 0)}, e os custos próprios dos itens somam ${formatCurrency(calculation.monthlyVariableCostCents ?? 0)}.`,
    emphasisLabel: "Receita depois de impostos e cartão",
    emphasisValue: optionalCurrency(calculation.monthlyNetRevenueCents),
    tone: "neutral",
  };
}

function monthlySection(
  calculation: DetailedDiagnosisCalculation,
): ReportSection {
  if (calculation.isPartial)
    return {
      key: "margin_diagnosis",
      title: "Quanto sobra no mês",
      body: "Falta informar as vendas de todos os itens para calcular o resultado mensal do negócio.",
      emphasisLabel: "Resultado mensal",
      emphasisValue: "Ainda não calculado",
      tone: calculation.items.some((item) => item.directLoss)
        ? "critical"
        : "neutral",
    };
  const result = calculation.monthlyResultCents ?? 0;
  const margin =
    calculation.finalMarginBasisPoints === null
      ? "Sem vendas para calcular"
      : formatBasisPoints(calculation.finalMarginBasisPoints);
  return {
    key: "margin_diagnosis",
    title: "Quanto sobra no mês",
    body: `O resultado considera a receita depois de impostos e cartão, menos os custos dos itens e os gastos mensais. Quanto sobra a cada R$ 100: ${margin}.`,
    emphasisLabel: verdictContent(calculation).label,
    emphasisValue: formatCurrency(result),
    tone:
      result > 0
        ? calculation.verdict === "tight_margin"
          ? "warning"
          : "positive"
        : result < 0
          ? "critical"
          : "neutral",
  };
}

function salesSection(
  calculation: DetailedDiagnosisCalculation,
): ReportSection {
  if (calculation.breakEvenRevenueCents === null)
    return {
      key: "sales_goal",
      title: "Quanto você precisa vender",
      body: calculation.isPartial
        ? "Falta informar as vendas de todos os itens para calcular uma referência de faturamento para o conjunto."
        : "As vendas precisam deixar um valor positivo antes que seja possível calcular o faturamento necessário.",
      emphasisLabel: "Faturamento necessário",
      emphasisValue: "Ainda não calculado",
      tone: calculation.isPartial ? "neutral" : "critical",
    };
  return {
    key: "sales_goal",
    title: "Quanto você precisa vender",
    body: "Esta é a referência de faturamento mensal necessária para que o valor deixado pelas vendas pague os gastos mensais.",
    emphasisLabel: "Faturamento necessário no mês",
    emphasisValue: formatCurrency(calculation.breakEvenRevenueCents),
    tone: "neutral",
  };
}

function buildDetailedReportContent(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedReportContent {
  const action = immediateAction(calculation);
  const monthlyResult = calculation.monthlyResultCents;
  const profitability =
    monthlyResult === null
      ? "Ainda não é possível calcular o resultado do mês. Falta informar as vendas de todos os itens."
      : monthlyResult > 0
        ? `Sim — o resultado do mês foi ${formatCurrency(monthlyResult)}.`
        : monthlyResult === 0
          ? "Ainda não — as vendas pagaram exatamente os gastos do mês."
          : `Não — o resultado do mês foi ${formatCurrency(monthlyResult)}.`;

  return {
    executiveSummary: {
      headline:
        command.category === "product"
          ? "Seus produtos dão lucro?"
          : "Suas produções dão lucro?",
      introduction:
        "Veja o resultado geral, os menores preços por item e o primeiro ponto que merece atenção.",
      verdict: verdictContent(calculation),
      facts: [
        {
          key: "margin",
          currentLabel: "Resultado do mês",
          currentValue: optionalCurrency(monthlyResult),
          referenceLabel: "Quanto sobra a cada R$ 100",
          referenceValue:
            calculation.finalMarginBasisPoints === null
              ? "Ainda não calculado"
              : formatBasisPoints(calculation.finalMarginBasisPoints),
        },
        {
          key: "price",
          currentLabel: "Faturamento atual",
          currentValue: optionalCurrency(calculation.monthlyGrossRevenueCents),
          referenceLabel: "Quanto precisa vender para cobrir os gastos",
          referenceValue: optionalCurrency(calculation.breakEvenRevenueCents),
        },
      ],
      priority: priorityContent(calculation),
      answers: [
        {
          key: "profitability",
          question: "Estou ganhando dinheiro?",
          answer: profitability,
        },
        {
          key: "price_sufficiency",
          question: "Meus preços pagam os gastos?",
          answer: calculation.isPartial
            ? "Os menores preços por item já estão calculados, mas falta informar todas as vendas para avaliar os gastos mensais."
            : calculation.monthlyResultCents !== null &&
                calculation.monthlyResultCents >= 0
              ? "Sim — com as vendas informadas, os preços cobrem os custos dos itens e os gastos mensais."
              : "Ainda não — com as vendas informadas, os preços não cobrem todos os custos e gastos mensais.",
        },
        {
          key: "immediate_action",
          question: "O que preciso fazer agora?",
          answer: action,
        },
      ],
    },
    sections: [
      minimumPriceSection(command, calculation),
      saleSection(calculation),
      monthlySection(calculation),
      salesSection(calculation),
    ],
  };
}

export { buildDetailedReportContent };
export type { DetailedReportContent };
