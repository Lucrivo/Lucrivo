import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { formatCurrency, formatReportUnit } from "../formatters";
import type {
  ReportExecutiveSummary,
  ReportTone,
  ServiceReportVerdict,
} from "../types";
import type { ServiceReportCalculation } from "./calculate-service-report";
import { multiplyDivideRound } from "./integer-math";

type MarginReading = {
  label: "Não calculado" | "Prejuízo" | "Pouca folga" | "Boa folga";
  tone: ReportTone;
};

const readingByVerdict: Record<ServiceReportVerdict, MarginReading> = {
  missing_price: { label: "Não calculado", tone: "neutral" },
  direct_loss: { label: "Prejuízo", tone: "critical" },
  operational_loss: { label: "Prejuízo", tone: "critical" },
  tight_margin: { label: "Pouca folga", tone: "warning" },
  adequate_margin: { label: "Boa folga", tone: "positive" },
  above_target: { label: "Boa folga", tone: "positive" },
};

function buildVerdict(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["verdict"] {
  const reading = readingByVerdict[calculation.verdict];
  const unit = formatReportUnit(calculation.unit);

  if (calculation.verdict === "missing_price") {
    return {
      ...reading,
      body: "Informe quanto você cobra para comparar o preço com seus gastos.",
    };
  }
  if (
    calculation.verdict === "direct_loss" ||
    calculation.verdict === "operational_loss"
  ) {
    const difference =
      calculation.minimumPriceCents === null
        ? null
        : Math.max(
            0,
            calculation.minimumPriceCents - calculation.currentPriceCents,
          );
    return {
      ...reading,
      body:
        difference === null
          ? "O preço informado não paga todos os gastos usados no cálculo."
          : `Faltam ${formatCurrency(difference)} por ${unit} para o preço pagar todos os gastos.`,
    };
  }
  if (calculation.verdict === "tight_margin") {
    return {
      ...reading,
      body: "O preço paga os gastos, mas deixa pouco espaço para imprevistos.",
    };
  }
  return {
    ...reading,
    body: "O preço paga os gastos e deixa espaço para imprevistos.",
  };
}

function buildFacts(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["facts"] {
  const reading = readingByVerdict[calculation.verdict];
  return [
    {
      key: "price",
      currentLabel: "Você cobra",
      currentValue: formatCurrency(calculation.currentPriceCents),
      referenceLabel: "Menor preço sem prejuízo",
      referenceValue:
        calculation.minimumPriceCents === null
          ? "Indisponível"
          : formatCurrency(calculation.minimumPriceCents),
    },
    {
      key: "margin",
      currentLabel: "Quanto sobra a cada R$ 100",
      currentValue:
        calculation.realMarginBasisPoints === null
          ? "Indisponível"
          : formatCurrency(calculation.realMarginBasisPoints),
      referenceLabel: "Leitura",
      referenceValue: reading.label,
    },
  ];
}

function financialWeights(
  command: NormalizedServiceDiagnosisCommand,
  calculation: ServiceReportCalculation,
) {
  const unitDurationMinutes =
    calculation.unit === "hour" ? 60 : command.appointmentDurationMinutes;
  return [
    {
      label: "Quanto você quer receber por mês",
      amount: multiplyDivideRound(
        command.desiredMonthlyIncomeCents,
        unitDurationMinutes,
        command.monthlyWorkMinutes,
      ),
    },
    {
      label: "Gastos que existem todo mês",
      amount: multiplyDivideRound(
        command.fixedMonthlyExpensesCents,
        unitDurationMinutes,
        command.monthlyWorkMinutes,
      ),
    },
    { label: "Materiais usados", amount: command.materialUnitCostCents },
    {
      label: "Impostos e taxas",
      amount: multiplyDivideRound(
        calculation.currentPriceCents,
        command.taxRateBasisPoints + command.cardFeeRateBasisPoints,
        10_000,
      ),
    },
  ] as const;
}

function buildPriority(
  command: NormalizedServiceDiagnosisCommand,
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["priority"] {
  if (
    calculation.verdict === "adequate_margin" ||
    calculation.verdict === "above_target"
  ) {
    return {
      label: "Quantidade de serviços",
      body: "Mantenha a quantidade de trabalho usada no cálculo e acompanhe se seus clientes aceitam o preço.",
    };
  }

  const weights = financialWeights(command, calculation);
  const largest = weights.reduce((selected, candidate) =>
    candidate.amount > selected.amount ? candidate : selected,
  );
  const unit = formatReportUnit(calculation.unit);
  return {
    label: largest.label,
    body: `${largest.label} é o maior peso no cálculo: ${formatCurrency(largest.amount)} por ${unit}. Confira esse valor primeiro.`,
  };
}

function buildProfitabilityAnswer(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  const unit = formatReportUnit(calculation.unit);
  let answer: string;
  if (calculation.unitProfitCents === null) {
    answer = "Ainda não dá para calcular com os dados informados.";
  } else if (calculation.unitProfitCents < 0) {
    answer = `Não — faltam ${formatCurrency(Math.abs(calculation.unitProfitCents))} por ${unit} para pagar os gastos.`;
  } else if (calculation.unitProfitCents === 0) {
    answer = "O preço apenas paga os gastos, sem deixar dinheiro.";
  } else {
    answer = `Sim — sobram ${formatCurrency(calculation.unitProfitCents)} por ${unit} depois de pagar os gastos.`;
  }
  return { key: "profitability", question: "Estou ganhando dinheiro?", answer };
}

function buildPriceAnswer(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  let answer: string;
  if (calculation.minimumPriceCents === null) {
    answer = "Ainda não dá para calcular com os dados informados.";
  } else if (calculation.currentPriceCents < calculation.minimumPriceCents) {
    answer = `Não — o menor preço sem prejuízo é ${formatCurrency(calculation.minimumPriceCents)}.`;
  } else {
    answer = "Sim — o preço paga todos os gastos usados no cálculo.";
  }
  return { key: "price_sufficiency", question: "Meu preço paga tudo?", answer };
}

function buildImmediateActionAnswer(
  priority: ReportExecutiveSummary["priority"],
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary["answers"][number] {
  const answer =
    priority.label === "Quantidade de serviços"
      ? priority.body
      : `Comece conferindo ${priority.label.toLocaleLowerCase("pt-BR")}.`;
  return {
    key: "immediate_action",
    question: "O que preciso fazer agora?",
    answer,
  };
}

function buildServiceExecutiveSummary(
  command: NormalizedServiceDiagnosisCommand,
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary {
  const priority = buildPriority(command, calculation);
  return {
    headline: "Seu serviço dá lucro?",
    introduction:
      "Compare seu preço com o mínimo necessário e veja o que merece atenção primeiro.",
    verdict: buildVerdict(calculation),
    facts: buildFacts(calculation),
    priority,
    answers: [
      buildProfitabilityAnswer(calculation),
      buildPriceAnswer(calculation),
      buildImmediateActionAnswer(priority, calculation),
    ],
  };
}

export { buildServiceExecutiveSummary };
