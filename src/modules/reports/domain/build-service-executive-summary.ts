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
    body: "O preço paga exatamente os valores considerados, sem sobra.",
    tone: "neutral",
  },
  positive_result: {
    label: "Resultado positivo",
    body: "O preço deixa um valor positivo depois dos valores considerados.",
    tone: "positive",
  },
} as const;

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
  const action = {
    missing_price: "Informe o preço atual para completar o cálculo.",
    direct_loss: "Compare o preço com materiais e cobranças da venda.",
    operational_loss: "Compare o preço atual com o menor preço calculado.",
    break_even: "Acompanhe o preço, os gastos e a rotina informada.",
    positive_result:
      "Acompanhe o valor e a porcentagem que sobram com a rotina informada.",
  }[calculation.verdict];

  return {
    headline: "Resultado do seu serviço",
    introduction:
      "Compare o preço atual com o menor preço completo e veja quanto sobra depois dos valores considerados.",
    verdict: verdictContent[calculation.verdict],
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
        currentLabel: "Quanto sobra por serviço",
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
      body: action,
    },
    answers: [
      {
        key: "profitability",
        question: "Quanto sobra por serviço?",
        answer:
          calculation.unitProfitCents === null
            ? "Ainda não foi possível calcular porque falta uma rotina de trabalho válida."
            : `Depois dos valores considerados, sobram ${resultText} por ${unit}.`,
      },
      {
        key: "price_sufficiency",
        question: "Qual é o menor preço completo?",
        answer:
          calculation.minimumPriceCents === null
            ? "Ainda não foi possível calcular com os dados de rotina informados."
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

export { buildServiceExecutiveSummary };
