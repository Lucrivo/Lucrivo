import { describe, expect, it } from "vitest";

import { getReportLanguageProfile } from "./report-language";

describe("getReportLanguageProfile", () => {
  it.each([
    ["service", 2],
    ["service", 3],
    ["product", 1],
    ["production", 1],
  ] as const)(
    "keeps legacy language for %s content %s",
    (category, contentVersion) => {
      const language = getReportLanguageProfile({ category, contentVersion });

      expect(language.isPlainLanguage).toBe(false);
      expect(language.reportEyebrow).toBe("Seu relatório financeiro");
      expect(language.priorityEyebrow).toBe("Principal ponto a corrigir");
      expect(language.numbersDescription).toBe(
        "Referências financeiras deste diagnóstico.",
      );
      expect(language.verdictLabels.tight_margin).toBe("Margem apertada");
    },
  );

  it.each([
    ["service", 4],
    ["product", 2],
    ["production", 2],
  ] as const)(
    "uses plain language for %s content %s",
    (category, contentVersion) => {
      expect(
        getReportLanguageProfile({ category, contentVersion }),
      ).toMatchObject({
        isPlainLanguage: true,
        reportEyebrow: "Resultado do seu diagnóstico",
        analysisAriaLabel: "Como chegamos a esse resultado",
        analysisEyebrow: "Entenda o resultado",
        analysisTitle: "Como chegamos a esse resultado",
        analysisDescription:
          "Veja o que precisa ser pago, quanto sobra e quantas vendas são necessárias.",
        numbersTitle: "Seus números",
        numbersDescription: "Valores calculados com o que você informou.",
        priorityEyebrow: "Comece por aqui",
        toneLabels: {
          neutral: "Informação",
          positive: "Bom resultado",
          warning: "Fique de olho",
          critical: "Precisa de atenção",
        },
        savedReportLabel: "Diagnóstico salvo",
        verdictLabels: {
          missing_price: "Informe o preço",
          direct_loss: "Venda com prejuízo",
          incomplete_volume: "Falta informar as vendas",
          operational_loss: "Preço abaixo dos gastos",
          tight_margin: "Abaixo da meta",
          adequate_margin: "Meta alcançada",
          above_target: "Acima da meta",
        },
      });
    },
  );

  it("uses the attention-band labels for current Service reports", () => {
    expect(
      getReportLanguageProfile({ category: "service", contentVersion: 5 })
        .verdictLabels,
    ).toMatchObject({
      direct_loss: "Prejuízo",
      operational_loss: "Prejuízo",
      tight_margin: "Pouca folga",
      adequate_margin: "Boa folga",
      above_target: "Boa folga",
    });
  });
});
