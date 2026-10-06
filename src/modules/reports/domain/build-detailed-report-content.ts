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
import {
  BREAK_EVEN_REFERENCE_PRIORITY_BODY,
  BREAK_EVEN_REFERENCE_VERDICT,
  scenarioImmediateAction,
  scenarioMinimumPriceBody,
  scenarioMonthlyBody,
  scenarioPriceSufficiencyAnswer,
  scenarioProfitabilityAnswer,
  scenarioSalesGoalBody,
} from "./break-even-scenario-copy";
import {
  deriveDetailedBreakEvenScenario,
  type DetailedBreakEvenScenario,
} from "./detailed-break-even-scenario";
import { calculateBreakEvenRevenue } from "./unit-economics";

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
      incomplete_volume: BREAK_EVEN_REFERENCE_VERDICT,
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
    incomplete_volume: BREAK_EVEN_REFERENCE_PRIORITY_BODY,
    no_sales: "Defina uma referência de vendas para o próximo mês.",
    operational_loss:
      "Revise primeiro os preços e os gastos considerados no mês.",
    break_even: "Crie uma pequena folga entre preços, gastos e vendas.",
    positive_result: "Acompanhe o resultado e preserve as condições atuais.",
  }[calculation.verdict];
}

function missingVolumeNames(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): string[] {
  const ids = new Set(calculation.missingVolumeItemIds);
  return command.items
    .filter((item) => ids.has(item.id))
    .map((item) => item.name);
}

function immediateAction(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
  scenario: DetailedBreakEvenScenario,
): string {
  if (calculation.verdict === "direct_loss") {
    return `Revise primeiro os preços e custos de ${joinNames(directLossNames(command, calculation))} antes de aumentar as vendas.`;
  }
  if (calculation.verdict === "incomplete_volume") {
    if (scenario.consolidated) {
      return scenarioImmediateAction(scenario.consolidated, "unidades");
    }
    return `Use a referência de equilíbrio de cada item como ponto de partida e informe as quantidades de ${joinNames(missingVolumeNames(command, calculation))} para ver o resultado do conjunto.`;
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

function itemReferenceList(
  command: DetailedDiagnosisCommand,
  scenario: DetailedBreakEvenScenario,
): string {
  return command.items
    .flatMap((item) => {
      const reference = scenario.byItem.get(item.id);
      if (!reference) return [];
      return [
        `${item.name}: ${formatIntegerVolume(reference.referenceVolume)} unidades`,
      ];
    })
    .join(" · ");
}

function profitabilityAnswer(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
  scenario: DetailedBreakEvenScenario,
): string {
  const result = calculation.monthlyResultCents;
  const lossNames = directLossNames(command, calculation);
  const itemWarning =
    lossNames.length > 0
      ? ` Porém, há perda por venda em: ${joinNames(lossNames)}.`
      : "";

  if (result === null) {
    if (scenario.consolidated) {
      const contribution = calculation.items[0]?.unitContributionCents ?? 0;
      return scenarioProfitabilityAnswer(
        scenario.consolidated,
        contribution,
        "unidades",
      );
    }
    const references = itemReferenceList(command, scenario);
    return references
      ? `Depende de quanto você vende. Sem as quantidades de todos os itens, mostramos quanto cada item precisaria vender sozinho para pagar os gastos do mês: ${references}.${itemWarning}`
      : `Ainda não dá para calcular se há lucro no conjunto porque faltam quantidades.${itemWarning}`;
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
  scenario: DetailedBreakEvenScenario,
): string {
  const lossNames = directLossNames(command, calculation);
  if (lossNames.length > 0) {
    return `Não completamente. Há itens que não cobrem seus próprios custos e cobranças: ${joinNames(lossNames)}.`;
  }
  if (calculation.verdict === "incomplete_volume") {
    return scenario.consolidated
      ? scenarioPriceSufficiencyAnswer(scenario.consolidated, "unidades")
      : "Sim, desde que as vendas alcancem o equilíbrio. Sem todas as quantidades, a referência é quanto cada item precisaria vender sozinho para pagar os gastos do mês.";
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
  scenario: DetailedBreakEvenScenario,
): ReportSection {
  const inputById = new Map(command.items.map((item) => [item.id, item]));
  const values = calculation.items.map((item) => {
    const name = inputById.get(item.itemId)?.name ?? "Item";
    const reference = scenario.byItem.get(item.itemId);
    if (item.breakEvenUnitPriceCents === null && reference) {
      return `${name}: ${reference.breakEvenPriceCents === null ? "Ainda não calculado" : formatCurrency(reference.breakEvenPriceCents)} vendendo ${formatIntegerVolume(reference.referenceVolume)} unidades`;
    }
    return `${name}: ${item.breakEvenUnitPriceCents === null ? "Ainda não calculado" : formatCurrency(item.breakEvenUnitPriceCents)}`;
  });
  return {
    key: "break_even",
    title: "Menores preços para não ficar no prejuízo",
    body: scenario.consolidated
      ? scenarioMinimumPriceBody(scenario.consolidated, "unidades")
      : calculation.isPartial
        ? `Para os itens sem quantidade, o preço mostrado é o preço de equilíbrio vendendo apenas aquele item. ${values.join(" · ")}`
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
      body: "Quanto esta unidade custa e o valor deixado por venda continuam disponíveis. Custo completo e resultado por venda usam a quantidade de equilíbrio como referência até que as quantidades de todos os itens sejam informadas.",
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
  scenario: DetailedBreakEvenScenario,
): ReportSection {
  const result = calculation.monthlyResultCents;
  const margin =
    calculation.finalMarginBasisPoints === null
      ? "Ainda não calculado"
      : formatBasisPoints(calculation.finalMarginBasisPoints);
  if (result === null && scenario.consolidated) {
    return {
      key: "margin_diagnosis",
      title: "Quanto sobra no mês",
      body: scenarioMonthlyBody(
        scenario.consolidated,
        calculation.items[0]?.unitContributionCents ?? 0,
        "unidades",
      ),
      emphasisLabel: "No ponto de equilíbrio",
      emphasisValue: formatCurrency(0),
      tone: "neutral",
    };
  }
  return {
    key: "margin_diagnosis",
    title: "Quanto sobra no mês",
    body:
      result === null
        ? "Sem as quantidades de todos os itens não dá para somar o resultado do conjunto sem inventar uma proporção. Cada item sem quantidade mostra quanto precisaria vender sozinho para chegar ao equilíbrio."
        : `O cálculo considera ${formatCurrency(calculation.monthlyNetRevenueCents ?? 0)} recebidos depois de impostos e cartão, menos os custos dos itens e os gastos mensais. Quanto sobra a cada R$ 100: ${margin}.`,
    emphasisLabel:
      result === null
        ? "Valor no mês"
        : result > 0
          ? "Lucro no mês"
          : result < 0
            ? "Prejuízo no mês"
            : "Sem lucro nem prejuízo",
    emphasisValue: optionalCurrency(result),
    tone:
      result === null
        ? "neutral"
        : result > 0
          ? "positive"
          : result < 0
            ? "critical"
            : "neutral",
  };
}

function detailedBreakEvenRevenue(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): number | null {
  if (calculation.breakEvenRevenueCents !== null) {
    return calculation.breakEvenRevenueCents;
  }
  if (command.items.length !== 1) return null;

  const item = command.items[0];
  const itemResult = calculation.items.find(
    (result) => result.itemId === item?.id,
  );
  if (!item || !itemResult) return null;

  return calculateBreakEvenRevenue(
    calculation.effectiveFixedCostCents,
    item.unitSalePriceCents,
    itemResult.unitContributionCents,
  );
}

function salesSection(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
  scenario: DetailedBreakEvenScenario,
): ReportSection {
  const breakEvenRevenueCents = detailedBreakEvenRevenue(command, calculation);
  if (breakEvenRevenueCents === null) {
    const references = itemReferenceList(command, scenario);
    const body = calculation.isPartial
      ? references
        ? `Sem as quantidades de todos os itens, a referência de equilíbrio é por item, vendendo apenas aquele item: ${references}.`
        : "Informe as quantidades de todos os itens para calcular uma referência de faturamento sem inventar a proporção entre eles."
      : calculation.verdict === "no_sales"
        ? "Informe uma quantidade vendida maior que zero para calcular o faturamento necessário com a proporção entre os itens."
        : "No preço atual, as vendas ainda não deixam um valor positivo suficiente para calcular o faturamento necessário.";
    return {
      key: "sales_goal",
      title: "Quanto você precisa vender",
      body,
      emphasisLabel: "Faturamento necessário no mês",
      emphasisValue: "Ainda não calculado",
      tone: "neutral",
    };
  }
  return {
    key: "sales_goal",
    title: "Quanto você precisa vender",
    body: scenario.consolidated
      ? scenarioSalesGoalBody(scenario.consolidated, "unidades")
      : command.items.length === 1
        ? "No preço atual, esta é a referência de faturamento mensal necessária para que o valor deixado pelas vendas pague os gastos mensais."
        : "Mantendo a proporção informada entre os itens, esta é a referência de faturamento mensal necessária para que o valor deixado pelas vendas pague os gastos mensais.",
    emphasisLabel: "Faturamento necessário no mês",
    emphasisValue: formatCurrency(breakEvenRevenueCents),
    tone: "neutral",
  };
}

function buildDetailedReportContent(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedReportContent {
  const scenario = deriveDetailedBreakEvenScenario(command, calculation);
  const action = immediateAction(command, calculation, scenario);
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
          currentValue:
            calculation.monthlyResultCents === null && scenario.consolidated
              ? "R$ 0,00 no ponto de equilíbrio"
              : optionalCurrency(calculation.monthlyResultCents),
          referenceLabel: "Quanto sobra a cada R$ 100",
          referenceValue:
            calculation.finalMarginBasisPoints === null
              ? scenario.consolidated
                ? "0% no ponto de equilíbrio"
                : "Ainda não calculado"
              : formatBasisPoints(calculation.finalMarginBasisPoints),
        },
        {
          key: "price",
          currentLabel: "Faturamento atual",
          currentValue: optionalCurrency(calculation.monthlyGrossRevenueCents),
          referenceLabel: "Faturamento que paga os gastos",
          referenceValue: optionalCurrency(
            calculation.breakEvenRevenueCents ??
              scenario.consolidated?.breakEvenRevenueCents ??
              null,
          ),
        },
      ],
      priority: { label: priorityLabel, body: summaryPriorityBody },
      answers: [
        {
          key: "profitability",
          question: "Estou ganhando dinheiro?",
          answer: profitabilityAnswer(command, calculation, scenario),
        },
        {
          key: "price_sufficiency",
          question: "Meus preços pagam todos os gastos?",
          answer: priceSufficiencyAnswer(command, calculation, scenario),
        },
        {
          key: "immediate_action",
          question: "O que preciso fazer agora?",
          answer: action,
        },
      ],
    },
    sections: [
      minimumPriceSection(command, calculation, scenario),
      saleSection(calculation),
      monthlySection(calculation, scenario),
      salesSection(command, calculation, scenario),
    ],
  };
}

export { buildDetailedReportContent };
export type { DetailedReportContent };
