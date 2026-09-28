import { describe, expect, it } from "vitest";

import type { ExecutiveSummaryAnswer } from "../types";
import { toComfortableReportAnswers } from "./to-comfortable-report-answers";

function answer(
  key: ExecutiveSummaryAnswer["key"],
  value: string,
): ExecutiveSummaryAnswer {
  return { key, question: "Pergunta", answer: value };
}

describe("toComfortableReportAnswers", () => {
  it("preserves objective calculated answers", () => {
    const results = toComfortableReportAnswers([
      answer(
        "profitability",
        "Com os valores informados, o resultado estimado do mês é R$ 4.200,00.",
      ),
      answer(
        "price_sufficiency",
        "O menor preço para não ficar no prejuízo é R$ 54,35.",
      ),
    ]);

    expect(results.map(({ answer: value }) => value)).toEqual([
      "Com os valores informados, o resultado estimado do mês é R$ 4.200,00.",
      "O menor preço para não ficar no prejuízo é R$ 54,35.",
    ]);
  });

  it("adds the action introduction once", () => {
    const results = toComfortableReportAnswers([
      answer("immediate_action", "Informe quantas vendas faz no mês."),
      answer("immediate_action", "Agora, o mais importante é: reveja o preço."),
    ]);

    expect(results.map(({ answer: value }) => value)).toEqual([
      "Agora, o mais importante é: informe quantas vendas faz no mês.",
      "Agora, o mais importante é: reveja o preço.",
    ]);
  });
});
