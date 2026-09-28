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
  it("explains a positive monthly result with warmer, direct language", () => {
    const [result] = toComfortableReportAnswers([
      answer("profitability", "Sim — o resultado do mês foi R$ 4.200,00."),
    ]);

    expect(result?.answer).toBe(
      "Sim, está. Com base nas informações, seu lucro no mês foi de R$ 4.200,00.",
    );
  });

  it("preserves scenario details while making short answers more conversational", () => {
    const results = toComfortableReportAnswers([
      answer(
        "profitability",
        "Sim — sobram R$ 27,41 por hora depois de pagar os gastos.",
      ),
      answer(
        "price_sufficiency",
        "Não — o preço precisa ser pelo menos R$ 54,35 para pagar os gastos informados.",
      ),
      answer(
        "immediate_action",
        "Acompanhe o resultado e preserve as condições atuais.",
      ),
    ]);

    expect(results.map(({ answer: value }) => value)).toEqual([
      "Sim, está. Com base nas informações, sobram R$ 27,41 por hora depois de pagar os gastos.",
      "Ainda não. Com base nas informações, o preço precisa ser pelo menos R$ 54,35 para pagar os gastos informados.",
      "Agora, o mais importante é: acompanhe o resultado e preserve as condições atuais.",
    ]);
  });

  it("describes loss and break-even results without harsh shorthand", () => {
    const results = toComfortableReportAnswers([
      answer("profitability", "Não — o resultado do mês foi -R$ 350,00."),
      answer(
        "profitability",
        "Ainda não — as vendas pagaram exatamente os gastos do mês.",
      ),
    ]);

    expect(results.map(({ answer: value }) => value)).toEqual([
      "Ainda não. Com base nas informações, houve um prejuízo de R$ 350,00 no mês.",
      "Ainda não há lucro. Com base nas informações, as vendas pagaram exatamente os gastos do mês.",
    ]);
  });

  it("adapts concise answers from saved legacy reports", () => {
    const results = toComfortableReportAnswers([
      answer("profitability", "Sim, há lucro por unidade."),
      answer(
        "profitability",
        "O preço apenas paga os gastos, sem deixar dinheiro.",
      ),
      answer("price_sufficiency", "O preço ainda está abaixo da meta."),
    ]);

    expect(results.map(({ answer: value }) => value)).toEqual([
      "Sim, está. Com base nas informações, há lucro por unidade.",
      "Ainda não há lucro. Com base nas informações, o preço apenas paga os gastos, sem deixar dinheiro.",
      "Ainda não. Com base nas informações, o preço ainda está abaixo da meta.",
    ]);
  });
});
