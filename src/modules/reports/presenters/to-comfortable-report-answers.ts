import type { ExecutiveSummaryAnswer } from "../types";

function lowerInitial(value: string): string {
  return value.charAt(0).toLocaleLowerCase("pt-BR") + value.slice(1);
}

function profitabilityAnswer(answer: string): string {
  const positiveMonthlyResult = answer.match(
    /^Sim — o resultado do mês foi (R\$ .+)\.$/,
  );
  if (positiveMonthlyResult?.[1]) {
    return (
      "Sim, está. Com base nas informações, seu lucro no mês foi de " +
      positiveMonthlyResult[1] +
      "."
    );
  }

  const negativeMonthlyResult = answer.match(
    /^Não — o resultado do mês foi -(R\$ .+)\.$/,
  );
  if (negativeMonthlyResult?.[1]) {
    return (
      "Ainda não. Com base nas informações, houve um prejuízo de " +
      negativeMonthlyResult[1] +
      " no mês."
    );
  }

  const breakEven = answer.match(/^Ainda não — (.+)$/);
  if (breakEven?.[1]) {
    return (
      "Ainda não há lucro. Com base nas informações, " +
      lowerInitial(breakEven[1])
    );
  }

  const positive = answer.match(/^Sim — (.+)$/);
  if (positive?.[1]) {
    return "Sim, está. Com base nas informações, " + lowerInitial(positive[1]);
  }

  const legacyPositive = answer.match(/^Sim, (.+)$/);
  if (legacyPositive?.[1]) {
    return (
      "Sim, está. Com base nas informações, " + lowerInitial(legacyPositive[1])
    );
  }

  const negative = answer.match(/^Não — (.+)$/);
  if (negative?.[1]) {
    return "Ainda não. Com base nas informações, " + lowerInitial(negative[1]);
  }

  const noSales = answer.match(/^Não neste mês — (.+)$/);
  if (noSales?.[1]) {
    return (
      "Ainda não neste mês. Com base nas informações, " +
      lowerInitial(noSales[1])
    );
  }

  const breakEvenPrice = answer.match(/^O preço apenas (.+)$/);
  if (breakEvenPrice?.[1]) {
    return (
      "Ainda não há lucro. Com base nas informações, o preço apenas " +
      breakEvenPrice[1]
    );
  }

  return answer
    .replace(
      /^Ainda não é possível calcular/,
      "Ainda não temos informações suficientes para calcular",
    )
    .replace(
      /^Ainda não dá para calcular/,
      "Ainda não temos informações suficientes para calcular",
    );
}

function priceAnswer(answer: string): string {
  const positive = answer.match(/^Sim — (.+)$/);
  if (positive?.[1]) {
    return "Sim. Com base nas informações, " + lowerInitial(positive[1]);
  }

  const negative = answer.match(/^Não — (.+)$/);
  if (negative?.[1]) {
    return "Ainda não. Com base nas informações, " + lowerInitial(negative[1]);
  }

  if (answer.startsWith("O preço ainda ")) {
    return "Ainda não. Com base nas informações, " + lowerInitial(answer);
  }

  return answer
    .replace(
      /^Ainda não é possível calcular/,
      "Ainda não temos informações suficientes para calcular",
    )
    .replace(
      /^Ainda não dá para calcular/,
      "Ainda não temos informações suficientes para calcular",
    );
}

function toComfortableReportAnswers(
  answers: readonly ExecutiveSummaryAnswer[],
): ExecutiveSummaryAnswer[] {
  return answers.map((entry) => {
    const answer =
      entry.key === "profitability"
        ? profitabilityAnswer(entry.answer)
        : entry.key === "price_sufficiency"
          ? priceAnswer(entry.answer)
          : entry.answer.startsWith("Agora, o mais importante é:")
            ? entry.answer
            : "Agora, o mais importante é: " + lowerInitial(entry.answer);

    return { ...entry, answer };
  });
}

export { toComfortableReportAnswers };
