import { ArrowRightIcon } from "@phosphor-icons/react";

import "./how-it-works-section.css";

const steps = [
  {
    title: "Informe os dados",
    description:
      "Responda perguntas simples sobre o que você cobra e o que gasta. Uma de cada vez.",
  },
  {
    title: "Nós calculamos",
    description:
      "O Lucrivo faz as contas por você e mostra tudo pronto — sem planilha e sem termo difícil.",
  },
  {
    title: "Veja seu diagnóstico",
    description:
      "Descubra se o preço que você cobra faz sentido pro seu negócio.",
  },
] as const;

function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      className="how-section chapter"
      aria-labelledby="how-title"
    >
      <div className="how-layout">
        <div className="how-title">
          <p className="eyebrow">Como funciona</p>
          <h2 id="how-title">
            Três passos.
            <br />
            Poucos minutos.
          </h2>
        </div>

        <ol className="how-steps">
          {steps.map(({ title, description }, index) => (
            <li className="how-step scroll-visual" key={title}>
              <span className="how-step-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="how-cta">
        <a className="button button-primary button-large" href="/register">
          Quero descobrir meu preço
          <ArrowRightIcon aria-hidden="true" size={20} weight="bold" />
        </a>
      </div>
    </section>
  );
}

export { HowItWorksSection };
