import { describe, expect, it } from "vitest";

import { getReportLanguageProfile } from "./report-language";

describe("getReportLanguageProfile", () => {
  it.each([
    ["service", 2, 1, 2],
    ["service", 3, 2, 3],
    ["product", 1, 1, 1],
    ["production", 1, 1, 1],
  ] as const)(
    "keeps legacy language for %s tuple %s/%s/%s",
    (category, schemaVersion, calculationVersion, contentVersion) => {
      const language = getReportLanguageProfile({
        category,
        schemaVersion,
        calculationVersion,
        contentVersion,
      });

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
    ["service", 3, 2, 4],
    ["product", 1, 1, 2],
    ["production", 1, 1, 2],
  ] as const)(
    "uses plain language for %s tuple %s/%s/%s",
    (category, schemaVersion, calculationVersion, contentVersion) => {
      expect(
        getReportLanguageProfile({
          category,
          schemaVersion,
          calculationVersion,
          contentVersion,
        }),
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
          no_sales: "Sem vendas no mês",
          break_even: "No limite",
          tight_margin: "Abaixo da meta",
          adequate_margin: "Meta alcançada",
          above_target: "Acima da meta",
        },
      });
    },
  );

  it("uses the attention-band labels for current Service reports", () => {
    expect(
      getReportLanguageProfile({
        category: "service",
        schemaVersion: 4,
        calculationVersion: 3,
        contentVersion: 5,
      }).verdictLabels,
    ).toMatchObject({
      direct_loss: "Prejuízo",
      operational_loss: "Prejuízo",
      tight_margin: "Pouca folga",
      adequate_margin: "Boa folga",
      above_target: "Boa folga",
    });
  });

  it.each(["product", "production"] as const)(
    "uses the current unit profile only for the full %s tuple",
    (category) => {
      const current = getReportLanguageProfile({
        category,
        schemaVersion: 2,
        calculationVersion: 2,
        contentVersion: 3,
      });
      const mismatched = getReportLanguageProfile({
        category,
        schemaVersion: 1,
        calculationVersion: 1,
        contentVersion: 3,
      });
      expect(current.verdictLabels).toMatchObject({
        no_sales: "Sem vendas no mês",
        break_even: "No limite",
        tight_margin: "Margem apertada",
        adequate_margin: "Lucro",
      });
      expect(mismatched).toBeDefined();
      expect(mismatched.verdictLabels.adequate_margin).not.toBe("Lucro");
    },
  );

  it.each(["product", "production"] as const)(
    "uses the current unit profile for detailed %s summaries",
    (category) => {
      const language = getReportLanguageProfile({
        category,
        schemaVersion: 1,
        calculationVersion: 1,
        contentVersion: 1,
        analysisMode: "detailed",
      });

      expect(language.verdictLabels).toMatchObject({
        direct_loss: "Prejuízo por venda",
        incomplete_volume: "Falta informar as vendas",
        tight_margin: "Margem apertada",
        adequate_margin: "Lucro",
      });
    },
  );
});
