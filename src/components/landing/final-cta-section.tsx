import { ArrowRightIcon } from "@phosphor-icons/react";

import "./final-cta-section.css";

function FinalCtaSection() {
  return (
    <section
      id="diagnostico"
      className="final-cta chapter"
      aria-labelledby="final-cta-title"
    >
      <div className="cta-noise" aria-hidden="true" />
      <h2 id="final-cta-title">
        Antes de mudar seu preço,
        <br />
        <em>descubra se a conta fecha.</em>
      </h2>
      <p className="final-cta-lead">
        Se você cobra um preço, o Lucrivo pode te ajudar. Leva poucos minutos e
        é gratuito.
      </p>
      <a className="button button-primary button-large" href="/register">
        Fazer meu diagnóstico gratuito
        <ArrowRightIcon aria-hidden="true" size={20} weight="bold" />
      </a>
      <p className="final-cta-micro">
        Análise gratuita • Resultado personalizado
      </p>
    </section>
  );
}

export { FinalCtaSection };
