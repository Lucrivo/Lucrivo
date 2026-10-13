import {
  CheckCircleIcon,
  FileTextIcon,
  MinusCircleIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react";

import "./result-colors-section.css";

const verdicts = [
  {
    tone: "positive",
    title: "Resultado positivo",
    description: "O preço deixa valor depois dos custos e gastos considerados.",
    icon: CheckCircleIcon,
  },
  {
    tone: "limit",
    title: "No limite",
    description:
      "O preço paga exatamente os valores considerados, sem lucro nem prejuízo.",
    icon: MinusCircleIcon,
  },
  {
    tone: "loss",
    title: "Prejuízo",
    description: "Cada venda ou o resultado estimado do mês fica negativo.",
    icon: WarningOctagonIcon,
  },
] as const;

function ResultColorsSection() {
  return (
    <section
      id="resultado"
      className="colors-section chapter"
      aria-labelledby="colors-title"
    >
      <div className="colors-layout">
        <div className="colors-heading">
          <h2 id="colors-title">
            O diagnóstico mostra como a conta realmente está.
          </h2>
          <p>
            Com base nos dados informados, o relatório verifica se o preço e as
            vendas pagam os valores considerados — e deixa o resultado fácil de
            reconhecer.
          </p>
        </div>

        <article className="colors-report" aria-label="Estados do diagnóstico">
          <header className="colors-report-header">
            <span aria-hidden="true">
              <FileTextIcon size={25} weight="duotone" />
            </span>
            <div>
              <p className="colors-report-title">Diagnóstico da sua conta</p>
              <p>Com base nas informações que você forneceu.</p>
            </div>
          </header>

          <ol className="colors-legend" aria-label="Vereditos do diagnóstico">
            {verdicts.map(({ tone, title, description, icon: Icon }) => (
              <li
                className="colors-row"
                data-tone={tone}
                data-reveal
                key={tone}
              >
                <span className="colors-row-icon" aria-hidden="true">
                  <Icon size={25} weight="duotone" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="colors-report-note">
            Se faltar preço, rotina ou quantidade, o relatório também mostra o
            que precisa ser completado.
          </p>
        </article>
      </div>
    </section>
  );
}

export { ResultColorsSection };
