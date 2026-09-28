import { describe, expect, it } from "vitest";

import { getReportLanguageProfile } from "./report-language";

describe("getReportLanguageProfile", () => {
  it("uses one objective language profile for every current report", () => {
    const service = getReportLanguageProfile({ category: "service" });
    const detailed = getReportLanguageProfile({
      category: "product",
      analysisMode: "detailed",
    });

    expect(service).toBe(detailed);
    expect(service).toMatchObject({
      isPlainLanguage: true,
      reportEyebrow: "Resultado do seu diagnóstico",
      priorityEyebrow: "Comece por aqui",
      toneLabels: {
        neutral: "Informação",
        positive: "Resultado positivo",
        warning: "Atenção",
        critical: "Precisa de atenção",
      },
    });
  });

  it("describes positive_result as an objective result", () => {
    expect(getReportLanguageProfile().verdictLabels.positive_result).toBe(
      "Resultado positivo",
    );
    expect(JSON.stringify(getReportLanguageProfile())).not.toMatch(
      /meta|adequada|apertada|boa folga/i,
    );
  });
});
