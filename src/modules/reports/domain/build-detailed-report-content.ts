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
        body: "As vendas pagam exatamente os valores considerados, sem lucro nem prejuízo.",
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

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "um item";
  return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

function directLossNames(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): string[] {
  const inputById = new Map(command.items.map((item) => [item.id, item.name]));
  return calculation.items
    .filter((item) => item.directLoss)
    .map((item) => inputById.get(item.itemId) ?? "Item");
}

function priorityBody(calculation: DetailedDiagnosisCalculation): string {
  return {
    direct_loss: "Revise primeiro os itens que geram perda por venda.",
    incomplete_volume:
      "Informe as quantidades restantes para completar o resultado.",
    no_sales: "Defina uma referência de vendas para o próximo mês.",
    operational_loss:
      "Revise primeiro os preços e os gastos considerados no mês.",
    break_even: "Crie uma pequena folga entre preços, gastos e vendas.",
    positive_result: "Acompanhe o resultado e preserve as condições atuais.",
  }[calculation.verdict];
}

function immediateAction(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): string {
  if (calculation.verdict === "direct_loss") {
    return `Revise primeiro os preços e custos de ${joinNames(directLossNames(command, calculation))} antes de aumentar as vendas.`;
  }
  if (calculation.verdict === "incomplete_volume") {
    return "Informe as quantidades restantes para completar o resultado do conjunto.";
  }
  if (calculation.verdict === "no_sales") {
    return command.items.length === 1
      ? "Use a quantidade necessária abaixo como primeira referência para o próximo mês."
      : "Defina uma proporção de vendas entre os itens para obter uma quantidade necessária confiável.";
  }
  if (calculation.verdict === "operational_loss") {
    return "Compare os preços atuais com os menores preços sem prejuízo e avalie a quantidade necessária.";
  }
  if (calculation.verdict === "break_even") {
    return "Busque uma pequena folga nos preços, nos gastos ou nas quantidades vendidas.";
  }
  return "Acompanhe o lucro do conjunto e verifique se algum item individual merece ajuste.";
}

function profitabilityAnswer(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): string {
  const result = calculation.monthlyResultCents;
  const lossNames = directLossNames(command, calculation);
  const itemWarning =
    lossNames.length > 0
      ? ` Porém, há perda por venda em: ${joinNames(lossNames)}.`
      : "";

  if (result === null) {
    return `Ainda não dá para calcular se há lucro no conjunto porque faltam quantidades.${itemWarning}`;
  }
  if (calculation.verdict === "no_sales") {
    return result < 0
      ? `Ainda não houve vendas no mês. Com os gastos informados, o prejuízo estimado é de ${formatCurrency(Math.abs(result))}.`
      : "Ainda não houve vendas no mês, e o resultado ficou em R$ 0,00.";
  }
  if (result < 0) {
    return `Não. O prejuízo estimado do conjunto é de ${formatCurrency(Math.abs(result))} no mês.${itemWarning}`;
  }
  if (result === 0) {
    return `Ainda não. Não há lucro nem prejuízo: o conjunto paga exatamente os valores considerados.${itemWarning}`;
  }
  return `Sim. O lucro estimado do conjunto é de ${formatCurrency(result)} no mês.${itemWarning}`;
}

function priceSufficiencyAnswer(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): string {
  const lossNames = directLossNames(command, calculation);
  if (lossNames.length > 0) {
    return `Não completamente. Há itens que não cobrem seus próprios custos e cobranças: ${joinNames(lossNames)}.`;
  }
  if (calculation.verdict === "incomplete_volume") {
    return "Ainda não dá para confirmar. Sem todas as quantidades, os gastos mensais não podem ser distribuídos corretamente entre os itens.";
  }
  if (calculation.verdict === "no_sales") {
    return "Ainda não dá para confirmar. Sem vendas, não existe uma proporção segura para distribuir os gastos mensais entre os itens.";
  }
  if (calculation.verdict === "operational_loss") {
    return "Não. Com as quantidades informadas, os preços não cobrem todos os custos e gastos mensais.";
  }
  if (calculation.verdict === "break_even") {
    return "Sim, exatamente. Os preços cobrem os custos e gastos considerados, sem gerar lucro nem prejuízo.";
  }
  return "Sim. Com a proporção informada, os preços cobrem os custos dos itens e os gastos mensais.";
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
      body: "Quanto esta unidade custa e o valor deixado por venda continuam disponíveis. Parte dos gastos do mês, custo completo por unidade e resultado por venda precisam das quantidades de todos os itens.",
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
  const action = immediateAction(command, calculation);
  const summaryPriorityBody = priorityBody(calculation);
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
      priority: { label: priorityLabel, body: summaryPriorityBody },
      answers: [
        {
          key: "profitability",
          question: "Estou ganhando dinheiro?",
          answer: profitabilityAnswer(command, calculation),
        },
        {
          key: "price_sufficiency",
          question: "Meus preços pagam todos os gastos?",
          answer: priceSufficiencyAnswer(command, calculation),
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
      salesSection(command, calculation),
    ],
  };
}

export { buildDetailedReportContent };
export type { DetailedReportContent };
