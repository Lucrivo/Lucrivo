import type { PlainLanguageHelpContent } from "@/components/shared/plain-language-help";

type TaxRateHelpOptions = {
  fixedExpensesStepNumber?: number;
  meiMode?: "percentage" | "choice";
};

function fixedExpensesDestination(stepNumber?: number) {
  return stepNumber
    ? `“Gastos que existem todo mês”, na etapa ${stepNumber}.`
    : "“Gastos que existem todo mês”.";
}

function taxRateHelp({
  fixedExpensesStepNumber,
  meiMode = "percentage",
}: TaxRateHelpOptions = {}): PlainLanguageHelpContent {
  const meiInstruction =
    meiMode === "choice"
      ? `Se você é MEI e paga o DAS mensal fixo, escolha “Não” e inclua o valor do DAS em ${fixedExpensesDestination(fixedExpensesStepNumber)}`
      : `Se você é MEI e paga o DAS mensal fixo, informe 0% aqui e inclua o valor do DAS em ${fixedExpensesDestination(fixedExpensesStepNumber)}`;

  return {
    triggerLabel: "Como preencher os impostos?",
    title: "Percentual de impostos sobre a venda",
    description: `Informe a alíquota efetiva média aplicada ao seu faturamento. Por exemplo: se aproximadamente R$ 6 de cada R$ 100 vendidos vão para tributos, informe 6%. Esse percentual varia conforme a atividade, o regime e o faturamento; confirme o valor com sua contabilidade. ${meiInstruction}`,
    technicalTerm: "alíquota efetiva média",
  };
}

const cardFeeRateHelp: PlainLanguageHelpContent = {
  triggerLabel: "Quais taxas devo somar?",
  title: "Taxas de cartão e plataforma",
  description:
    "Some todas as cobranças percentuais que incidem sobre a venda, como comissão da plataforma, entrega, pagamento on-line, cartão e antecipação. Exemplo ilustrativo: 10% de comissão + 4% de entrega + 3,5% do cartão = 17,5%. Em aplicativos de entrega, confira e some cada taxa prevista no seu plano.",
};

export { cardFeeRateHelp, taxRateHelp, type TaxRateHelpOptions };
