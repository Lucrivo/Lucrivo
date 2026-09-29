import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  formatBasisPoints,
  formatCurrency,
  formatReportUnit,
} from "../formatters";
import type { ReportExecutiveSummary } from "../types";
import type { ServiceReportCalculation } from "./calculate-service-report";

const verdictContent = {
  missing_price: {
    label: "Preço não informado",
    body: "Informe quanto você cobra para calcular o resultado.",
    tone: "neutral",
  },
  direct_loss: {
    label: "Prejuízo direto",
    body: "O preço não paga os materiais e as cobranças da venda.",
    tone: "critical",
  },
  operational_loss: {
    label: "Resultado negativo",
    body: "O preço não paga todos os valores considerados.",
    tone: "critical",
  },
  break_even: {
    label: "Ponto de equilíbrio",
    body: "O preço paga exatamente os valores considerados, sem lucro nem prejuízo.",
    tone: "neutral",
  },
  positive_result: {
    label: "Resultado positivo",
    body: "O preço deixa um valor positivo depois dos valores considerados.",
    tone: "positive",
  },
} as const;
function serviceVerdictContent(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["verdict"] {
  if (
    calculation.verdict === "operational_loss" &&
    calculation.unitProfitCents === null
  ) {
    return {
      label: "Falta completar a rotina",
      body: "A rotina informada ainda não permite distribuir os gastos por serviço.",
      tone: "neutral",
    };
  }
  return verdictContent[calculation.verdict];
}

function profitabilityAnswer(
  calculation: ServiceReportCalculation,
  unit: string,
): string {
  if (calculation.verdict === "missing_price") {
    return "Ainda não dá para calcular se há lucro. Falta informar quanto você cobra.";
  }

  if (calculation.verdict === "direct_loss") {
    const contribution = calculation.unitContributionCents;
    return contribution !== null && contribution < 0
      ? `Não. Cada ${unit} gera uma perda de ${formatCurrency(Math.abs(contribution))} antes mesmo de pagar a estrutura mensal.`
      : `Não. O preço paga apenas os materiais e as cobranças da venda, sem deixar valor para a estrutura mensal por ${unit}.`;
  }

  if (calculation.unitProfitCents === null) {
    return "Ainda não dá para calcular se há lucro com segurança. A rotina de trabalho não permite distribuir os gastos.";
  }

  if (calculation.verdict === "operational_loss") {
    return `Não. Seu prejuízo estimado é de ${formatCurrency(Math.abs(calculation.unitProfitCents))} por ${unit}, depois dos valores considerados.`;
  }

  if (calculation.verdict === "break_even") {
    return "Ainda não. Não há lucro nem prejuízo: o preço paga exatamente os valores considerados.";
  }

  return `Sim. Seu lucro estimado é de ${formatCurrency(calculation.unitProfitCents)} por ${unit}, depois dos valores considerados.`;
}

function priceSufficiencyAnswer(calculation: ServiceReportCalculation): string {
  if (calculation.verdict === "missing_price") {
    return "Ainda não dá para confirmar sem o preço atual.";
  }
  if (calculation.minimumPriceCents === null) {
    return "Ainda não dá para calcular o menor preço completo com a rotina informada.";
  }
  if (
    calculation.verdict === "direct_loss" ||
    calculation.verdict === "operational_loss"
  ) {
    return `Não. O menor preço para não ficar no prejuízo é ${formatCurrency(calculation.minimumPriceCents)}.`;
  }
  if (calculation.verdict === "break_even") {
    return "Sim, exatamente. O preço paga todos os valores considerados, sem gerar lucro nem prejuízo.";
  }
  return "Sim. O preço paga todos os gastos usados no cálculo.";
}

function buildServiceExecutiveSummary(
  _command: NormalizedServiceDiagnosisCommand,
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary {
  const unit = formatReportUnit(calculation.unit);
  const resultText =
    calculation.unitProfitCents === null
      ? "Ainda não calculado"
      : formatCurrency(calculation.unitProfitCents);
  const marginText =
    calculation.realMarginBasisPoints === null
      ? "Ainda não calculado"
      : formatBasisPoints(calculation.realMarginBasisPoints);
  const priorityBody = {
    missing_price: "Informe o preço atual para completar o cálculo.",
    direct_loss:
      "Revise primeiro o preço, os materiais e as cobranças da venda.",
    operational_loss:
      calculation.unitProfitCents === null
        ? "Revise primeiro a rotina usada para distribuir os gastos."
        : "Revise primeiro o preço e os valores considerados no serviço.",
    break_even:
      "Crie uma pequena folga entre o preço e os valores considerados.",
    positive_result: "Acompanhe o resultado e preserve as condições atuais.",
  }[calculation.verdict];
  const action = {
    missing_price: "Informe o preço atual para concluir a comparação.",
    direct_loss:
      "Revise o preço, os materiais e as cobranças antes de buscar mais serviços.",
    operational_loss:
      calculation.unitProfitCents === null
        ? "Revise os dias, as horas e a duração dos atendimentos informados."
        : "Compare o preço atual com o menor preço sem prejuízo e revise a rotina ou os gastos.",
    break_even:
      "Busque uma pequena folga no preço, nos custos ou na quantidade de serviços.",
    positive_result:
      "Acompanhe a quantidade de serviços e preserve as condições atuais.",
  }[calculation.verdict];
  const profitability = profitabilityAnswer(calculation, unit);
  const priceAnswer = priceSufficiencyAnswer(calculation);

  return {
    headline: "Resultado do seu serviço",
    introduction:
      "Compare o preço atual com o menor preço completo e veja o resultado depois dos valores considerados.",
    verdict: serviceVerdictContent(calculation),
    facts: [
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
      {
        key: "margin",
        currentLabel: "Resultado por serviço",
        currentValue: resultText,
        referenceLabel: "Quanto sobra a cada R$ 100",
        referenceValue: marginText,
      },
    ],
    priority: {
      label: {
        cost: "Custos do serviço",
        price: "Preço",
        margin: "Resultado",
        volume: "Quantidade de serviços",
      }[calculation.priority],
      body: priorityBody,
    },
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

export { buildServiceExecutiveSummary };
