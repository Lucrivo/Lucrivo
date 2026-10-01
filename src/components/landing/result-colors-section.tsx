import {
  CheckCircleIcon,
  MinusCircleIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react";

import "./result-colors-section.css";

const verdicts = [
  {
    tone: "positive",
    title: "Resultado positivo",
    description: "A conta fecha com o que você informou.",
    icon: CheckCircleIcon,
  },
  {
    tone: "limit",
    title: "No limite",
    description: "Cobre os custos, sem sobra.",
    icon: MinusCircleIcon,
  },
  {
    tone: "loss",
    title: "Prejuízo",
    description: "A venda ou o mês sai negativo.",
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
            O diagnóstico diz o que a conta está fazendo.
          </h2>
          <p>
            O relatório nomeia o resultado: positivo, no limite ou prejuízo —
            com os dados que você informou.
          </p>
        </div>

        <ol className="colors-legend" aria-label="Vereditos do diagnóstico">
          {verdicts.map(({ tone, title, description, icon: Icon }) => (
            <li className="colors-row" data-tone={tone} data-reveal key={tone}>
              <h3>
                <span className="colors-badge">
                  <Icon aria-hidden="true" size={18} weight="fill" />
                  {title}
                </span>
              </h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export { ResultColorsSection };
