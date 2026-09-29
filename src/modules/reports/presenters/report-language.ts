import type { ReportTone, ReportVerdict } from "../types";

type ReportLanguageProfile = {
  isPlainLanguage: true;
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

const currentReportLanguage = {
  isPlainLanguage: true,
  reportEyebrow: "Resultado do seu diagnóstico",
  analysisAriaLabel: "Como chegamos a esse resultado",
  analysisEyebrow: "Entenda o resultado",
  analysisTitle: "Como chegamos a esse resultado",
  analysisDescription:
    "Veja o que precisa ser pago, qual é o resultado e quantas vendas são necessárias.",
  numbersTitle: "Seus números",
  numbersDescription: "Valores calculados com o que você informou.",
  priorityEyebrow: "Comece por aqui",
  toneLabels: {
    neutral: "Informação",
    positive: "Resultado positivo",
    warning: "Atenção",
    critical: "Precisa de atenção",
  },
  savedReportLabel: "Diagnóstico salvo",
  verdictLabels: {
    missing_price: "Informe o preço",
    direct_loss: "Prejuízo por venda",
    incomplete_volume: "Falta informar as vendas",
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
