import {
  ArrowRightIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  FileTextIcon,
  ListChecksIcon,
  TargetIcon,
} from "@phosphor-icons/react";

import "./diagnosis-preview-section.css";

const reportQuestions = [
  {
    question: "Estou ganhando dinheiro?",
    answer: "Veja o resultado depois dos valores considerados.",
  },
  {
    question: "Meu preço paga todos os gastos?",
    answer: "Compare o preço atual com o menor preço sem prejuízo.",
  },
  {
    question: "O que preciso fazer agora?",
    answer: "Receba uma prioridade calculada para o seu cenário.",
  },
] as const;

type ReportNumber = {
  label: string;
  value: string;
  tone?: "positive";
};

const reportNumbers: ReadonlyArray<ReportNumber> = [
  { label: "Preço atual", value: "R$ 55,00" },
  { label: "Menor preço para não ficar no prejuízo", value: "R$ 38,71" },
  { label: "Resultado do mês", value: "R$ 3.030,00", tone: "positive" },
  { label: "Vendas necessárias no mês", value: "114 vendas" },
];

const reportHighlights = [
  {
    title: "O que merece atenção primeiro",
    description: "Uma prioridade objetiva abre o relatório.",
    icon: TargetIcon,
  },
  {
    title: "As respostas que orientam a decisão",
    description: "Lucro, preço e próximo passo em linguagem direta.",
    icon: ListChecksIcon,
  },
  {
    title: "Os números que sustentam o resultado",
    description: "Valores calculados com o que você informou.",
    icon: ChartLineUpIcon,
  },
] as const;

function DiagnosisPreviewSection() {
  return (
    <section
      id="previa"
      className="preview-section chapter"
      aria-labelledby="preview-title"
    >
      <div className="preview-layout">
        <div className="preview-copy">
          <h2 id="preview-title">Por dentro do seu diagnóstico.</h2>
          <p className="preview-lead">
            Você não recebe só um número. O relatório organiza o que merece
            atenção, responde às perguntas principais e mostra as referências
            usadas no cálculo.
          </p>

          <ul className="preview-highlights">
            {reportHighlights.map(({ title, description, icon: Icon }) => (
              <li key={title} data-reveal>
                <span className="preview-highlight-icon" aria-hidden="true">
                  <Icon size={21} weight="duotone" />
                </span>
                <p>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </p>
              </li>
            ))}
          </ul>

          <a className="button button-primary" href="/register">
            Quero ver isso no meu negócio
            <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
          </a>
        </div>

        <article
          className="preview-report"
          aria-label="Exemplo da estrutura do relatório"
          data-reveal
        >
          <header className="preview-report-header">
            <span className="preview-report-icon" aria-hidden="true">
              <FileTextIcon size={24} weight="duotone" />
            </span>
            <div>
              <p>Resultado do seu diagnóstico</p>
              <h3>Diagnóstico de Produto</h3>
              <div className="preview-report-tags" aria-label="Contexto">
                <span>Produto</span>
                <span>Revenda</span>
              </div>
            </div>
          </header>

          <section
            className="preview-priority"
            aria-labelledby="preview-priority-title"
          >
            <div className="preview-priority-topline">
              <p>Comece por aqui</p>
              <span>
                <CheckCircleIcon aria-hidden="true" size={17} weight="fill" />
                Resultado positivo
              </span>
            </div>
            <h4 id="preview-priority-title">Resultado</h4>
            <p>Acompanhe o resultado e preserve as condições atuais.</p>
          </section>

          <ol className="preview-questions" aria-label="Respostas do relatório">
            {reportQuestions.map(({ question, answer }, index) => (
              <li key={question}>
                <span aria-hidden="true">{index + 1}</span>
                <p>
                  <strong>{question}</strong>
                  <span>{answer}</span>
                </p>
              </li>
            ))}
          </ol>

          <section
            className="preview-numbers"
            aria-labelledby="preview-numbers-title"
          >
            <h4 id="preview-numbers-title">Seus números</h4>
            <dl>
              {reportNumbers.map(({ label, value, tone }) => (
                <div key={label} data-tone={tone}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="preview-note">
            Exemplo explicativo com valores fictícios.
          </p>
        </article>
      </div>
    </section>
  );
}

export { DiagnosisPreviewSection };
