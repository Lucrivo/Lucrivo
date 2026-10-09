import type { ReportTone, ReportVerdict } from "../types";

type ReportLanguageProfile = {
  isPlainLanguage: true;
  reportEyebrow: string;
  analysisAriaLabel: string;
  analysisEyebrow: string;
  analysisTitle: string;
  analysisDescription: string;
  priorityEyebrow: string;
  toneLabels: Record<ReportTone, string>;
  verdictLabels: Record<ReportVerdict, string>;
};

const currentReportLanguage = {
  isPlainLanguage: true,
  reportEyebrow: "Resultado do seu diagnóstico",
  analysisAriaLabel: "Como chegamos a esse resultado",
  analysisEyebrow: "Entenda o resultado",
  analysisTitle: "Como chegamos a esse resultado",
  analysisDescription:
    "Os indicadores abaixo reagem ao que você informou: quanto precisa vender, qual é o menor preço e quanto sobra.",
  priorityEyebrow: "Comece por aqui",
  toneLabels: {
    neutral: "Informação",
    positive: "Resultado positivo",
    warning: "Atenção",
    critical: "Precisa de atenção",
  },
  verdictLabels: {
    missing_price: "Informe o preço",
    direct_loss: "Prejuízo por venda",
    incomplete_volume: "Equilíbrio como referência",
    operational_loss: "Prejuízo no mês",
    no_sales: "Sem vendas no mês",
    break_even: "No limite",
    positive_result: "Resultado positivo",
  },
} as const satisfies ReportLanguageProfile;

function getReportLanguageProfile(_snapshot?: unknown): ReportLanguageProfile {
  return currentReportLanguage;
}

export { getReportLanguageProfile, type ReportLanguageProfile };
