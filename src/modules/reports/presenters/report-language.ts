import type { ReportSnapshot, ReportTone, ReportVerdict } from "../types";

type ReportLanguageProfile = {
  isPlainLanguage: boolean;
  reportEyebrow: string;
  analysisAriaLabel: string;
  analysisEyebrow: string;
  analysisTitle: string;
  analysisDescription: string;
  numbersTitle: string;
  numbersDescription: string;
  priorityEyebrow: string;
  toneLabels: Record<ReportTone, string>;
  savedReportLabel: string;
  verdictLabels: Record<ReportVerdict, string>;
};

type ReportVersionIdentity = Pick<
  ReportSnapshot,
  "category" | "schemaVersion" | "calculationVersion" | "contentVersion"
>;

const legacyReportLanguage = {
  isPlainLanguage: false,
  reportEyebrow: "Seu relatório financeiro",
  analysisAriaLabel: "Análise detalhada",
  analysisEyebrow: "Como chegamos aqui",
  analysisTitle: "Entenda seus números",
  analysisDescription:
    "Leia na ordem: primeiro proteja o custo, depois avalie margem e volume.",
  numbersTitle: "Seus números",
  numbersDescription: "Referências financeiras deste diagnóstico.",
  priorityEyebrow: "Principal ponto a corrigir",
  toneLabels: {
    neutral: "Informação",
    positive: "Situação positiva",
    warning: "Ponto de atenção",
    critical: "Ação necessária",
  },
  savedReportLabel: "Relatório financeiro salvo",
  verdictLabels: {
    missing_price: "Informe o preço",
    direct_loss: "Prejuízo direto",
    incomplete_volume: "Complete o diagnóstico",
    operational_loss: "Preço não cobre a operação",
    no_sales: "Sem vendas no mês",
    break_even: "No limite",
    tight_margin: "Margem apertada",
    adequate_margin: "Margem adequada",
    above_target: "Acima da meta",
  },
} as const satisfies ReportLanguageProfile;

const plainReportLanguage = {
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
} as const satisfies ReportLanguageProfile;

const normalizedServiceReportLanguage = {
  ...plainReportLanguage,
  verdictLabels: {
    ...plainReportLanguage.verdictLabels,
    direct_loss: "Prejuízo",
    operational_loss: "Prejuízo",
    no_sales: "Sem vendas no mês",
    break_even: "No limite",
    tight_margin: "Pouca folga",
    adequate_margin: "Boa folga",
    above_target: "Boa folga",
  },
} as const satisfies ReportLanguageProfile;

const currentUnitReportLanguage = {
  ...plainReportLanguage,
  verdictLabels: {
    ...plainReportLanguage.verdictLabels,
    direct_loss: "Prejuízo por venda",
    operational_loss: "Prejuízo no mês",
    no_sales: "Sem vendas no mês",
    break_even: "No limite",
    tight_margin: "Margem apertada",
    adequate_margin: "Lucro",
  },
} as const satisfies ReportLanguageProfile;

function usesPlainLanguage(snapshot: ReportVersionIdentity): boolean {
  return (
    (snapshot.category === "service" &&
      (snapshot.contentVersion === 4 || snapshot.contentVersion === 5)) ||
    (snapshot.category === "product" && snapshot.contentVersion === 2) ||
    (snapshot.category === "production" && snapshot.contentVersion === 2)
  );
}

function getReportLanguageProfile(
  snapshot: ReportVersionIdentity,
): ReportLanguageProfile {
  if (
    (snapshot.category === "product" || snapshot.category === "production") &&
    snapshot.schemaVersion === 2 &&
    snapshot.calculationVersion === 2 &&
    snapshot.contentVersion === 3
  ) {
    return currentUnitReportLanguage;
  }
  if (snapshot.category === "service" && snapshot.contentVersion === 5) {
    return normalizedServiceReportLanguage;
  }
  return usesPlainLanguage(snapshot)
    ? plainReportLanguage
    : legacyReportLanguage;
}

export { getReportLanguageProfile, type ReportLanguageProfile };
