import type {
  DetailedDiagnosisCalculation,
  DetailedDiagnosisCommand,
} from "@/modules/detailed-diagnosis/types";

import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "../formatters";
import type { ReportExecutiveSummary, ReportSection } from "../types";
import { calculateDetailedSalesGoal } from "./calculate-detailed-sales-goal";

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
  return (
    {
      direct_loss: {
        label: "Prejuízo por venda",
        body: "Há itens que deixam um valor negativo antes dos gastos mensais.",
        tone: "critical",
      },
      incomplete_volume: {
        label: "Falta informar as vendas",
        body: "O resultado mensal depende das quantidades ainda não informadas.",
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
    } as const
  )[calculation.verdict];
}

function immediateAction(calculation: DetailedDiagnosisCalculation): string {
  return {
    direct_loss: "Revise preço e custo dos itens que geram perda por venda.",
    incomplete_volume:
      "Informe as quantidades restantes para calcular o resultado do conjunto.",
    no_sales: "Use a quantidade necessária como referência para o próximo mês.",
    operational_loss:
      "Compare preços, custos completos e a quantidade necessária.",
    break_even: "Acompanhe preços, gastos e quantidades informadas.",
    positive_result:
      "Acompanhe o valor e a porcentagem que sobram com o conjunto informado.",
  }[calculation.verdict];
}

function minimumPriceSection(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): ReportSection {
  const inputById = new Map(command.items.map((item) => [item.id, item]));
  const values = calculation.items.map((item) => {
    const name = inputById.get(item.itemId)?.name ?? "Item";
    return `${name}: ${item.breakEvenUnitPriceCents === null ? "Ainda não calculado" : formatCurrency(item.breakEvenUnitPriceCents)}`;
  });
  return {
    key: "break_even",
    title: "Menores preços para não ficar no prejuízo",
    body: calculation.isPartial
      ? `Não dividimos os gastos do mês porque faltam quantidades. ${values.join(" · ")}`
      : `Cada valor inclui o custo direto, a parte dos gastos do mês e as cobranças da venda. ${values.join(" · ")}`,
    emphasisLabel: "Itens analisados",
    emphasisValue: String(values.length),
    tone: calculation.items.some((item) => item.directLoss)
      ? "critical"
      : "neutral",
  };
}

function saleSection(calculation: DetailedDiagnosisCalculation): ReportSection {
  if (calculation.isPartial) {
    return {
      key: "hidden_cost",
      title: "Custo e resultado por unidade",
      body: "Quanto esta unidade custa e o valor deixado por venda continuam disponíveis. Parte dos gastos do mês, custo completo por unidade e quanto sobra por venda precisam das quantidades de todos os itens.",
      emphasisLabel: "Valores completos",
      emphasisValue: "Ainda não calculado",
      tone: "neutral",
    };
  }
  return {
    key: "hidden_cost",
    title: "O que sai das vendas",
    body: `Impostos e cartão retiram ${formatCurrency(calculation.monthlyFeeAmountCents ?? 0)} no mês. Os custos diretos dos itens somam ${formatCurrency(calculation.monthlyVariableCostCents ?? 0)} e os gastos mensais são subtraídos uma vez do conjunto.`,
    emphasisLabel: "Receita depois de impostos e cartão",
    emphasisValue: optionalCurrency(calculation.monthlyNetRevenueCents),
    tone: "neutral",
  };
}

function monthlySection(
  calculation: DetailedDiagnosisCalculation,
): ReportSection {
  return {
    key: "margin_diagnosis",
    title: "Resultado do mês",
    body:
      calculation.monthlyResultCents === null
        ? "Faltam quantidades para calcular o resultado do conjunto sem inventar uma proporção entre os itens."
        : `Quanto sobra a cada R$ 100: ${calculation.finalMarginBasisPoints === null ? "Ainda não calculado" : formatBasisPoints(calculation.finalMarginBasisPoints)}.`,
    emphasisLabel: "Resultado do mês",
    emphasisValue: optionalCurrency(calculation.monthlyResultCents),
    tone:
      calculation.monthlyResultCents === null
        ? "neutral"
        : calculation.monthlyResultCents > 0
          ? "positive"
          : calculation.monthlyResultCents < 0
            ? "critical"
            : "neutral",
  };
}

function salesSection(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): ReportSection {
  const goal = calculateDetailedSalesGoal(command, calculation, {
    weeklyDivisorHundredths: 433,
    operatingDaysPerWeek: 6,
  });
  if (!goal.available) {
    return {
      key: "sales_goal",
      title: "Quantas vendas pagam o mês",
      body: goal.reason,
      emphasisLabel: "Quantidade necessária",
      emphasisValue: "Ainda não calculado",
      tone: "neutral",
    };
  }
  return {
    key: "sales_goal",
    title: "Quantas vendas pagam o mês",
    body: goal.basedOnKnownMix
      ? `Mantendo a proporção informada entre os itens, cerca de ${formatIntegerVolume(goal.monthly)} vendas pagam os gastos do mês.`
      : `Como há um único item, no preço atual cerca de ${formatIntegerVolume(goal.monthly)} vendas pagam os gastos do mês. Não mostramos uma divisão semanal ou diária sem uma rotina informada.`,
    emphasisLabel: "Vendas necessárias no mês",
    emphasisValue: `${formatIntegerVolume(goal.monthly)} vendas`,
    tone: "neutral",
  };
}

function buildDetailedReportContent(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedReportContent {
  const action = immediateAction(calculation);
  const priorityLabel = {
    cost: "Custos dos itens",
    data: "Quantidades vendidas",
    price: "Preços e gastos",
    margin: "Resultado",
    volume: "Quantidade de vendas",
  }[calculation.priority];
  return {
    executiveSummary: {
      headline:
        command.category === "product"
          ? "Resultado dos seus produtos"
          : "Resultado das suas produções",
      introduction:
        "Veja o resultado do conjunto e os valores completos de cada item quando todas as quantidades são conhecidas.",
      verdict: verdictContent(calculation),
      facts: [
        {
          key: "margin",
          currentLabel: "Resultado do mês",
          currentValue: optionalCurrency(calculation.monthlyResultCents),
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
          referenceLabel: "Faturamento que paga os gastos",
          referenceValue: optionalCurrency(calculation.breakEvenRevenueCents),
        },
      ],
      priority: { label: priorityLabel, body: action },
      answers: [
        {
          key: "profitability",
          question: "Quanto sobra com o conjunto informado?",
          answer:
            calculation.monthlyResultCents === null
              ? "Ainda não calculado porque faltam quantidades de um ou mais itens."
              : `O resultado estimado do mês é ${formatCurrency(calculation.monthlyResultCents)}.`,
        },
        {
          key: "price_sufficiency",
          question: "Os menores preços incluem os gastos do mês?",
          answer: calculation.isPartial
            ? "Ainda não. Sem todas as quantidades, não dividimos os gastos do mês entre as unidades."
            : "Sim. Os menores preços usam o custo completo de cada item.",
        },
        {
          key: "immediate_action",
          question: "O que posso observar agora?",
          answer: action,
        },
      ],
    },
    sections: [
      minimumPriceSection(command, calculation),
      saleSection(calculation),
      monthlySection(calculation),
      salesSection(command, calculation),
    ],
  };
}

export { buildDetailedReportContent };
export type { DetailedReportContent };
