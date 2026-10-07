import { ShieldCheckIcon } from "@phosphor-icons/react";

import {
  GUARANTEE_DAYS,
  SUPPORT_EMAIL,
} from "@/components/landing/landing-offer";

import "./guarantee-section.css";

function GuaranteeSection({
  monthlyPriceLabel,
}: {
  monthlyPriceLabel: string;
}) {
  const steps = [
    {
      title: "Assine",
      description: `Pague ${monthlyPriceLabel} com cartão ou Pix. O acesso libera na hora.`,
    },
    {
      title: `Use por ${GUARANTEE_DAYS} dias`,
      description: "Coloque seus produtos e veja o resultado de cada um.",
    },
    {
      title: "Não gostou? Peça de volta",
      description: (
        <>
          Mande um email para{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> e devolvemos o
          valor pelo mesmo meio que você pagou.
        </>
      ),
    },
  ];

  return (
    <section
      id="garantia"
      className="guarantee-section chapter"
      aria-labelledby="guarantee-title"
    >
      <div className="guarantee-glow" aria-hidden="true" />

      <div className="guarantee-layout">
        <div className="guarantee-intro">
          <div
            className="guarantee-seal"
            role="img"
            aria-label={`Garantia de ${GUARANTEE_DAYS} dias`}
          >
            <span className="guarantee-seal-ring" aria-hidden="true" />
            <ShieldCheckIcon aria-hidden="true" size={38} weight="fill" />
            <span className="guarantee-seal-label" aria-hidden="true">
              Garantia de
            </span>
            <strong className="guarantee-seal-days" aria-hidden="true">
              {GUARANTEE_DAYS} dias
            </strong>
          </div>

          <div className="guarantee-copy">
            <h2 id="guarantee-title">Você não arrisca nada.</h2>
            <p>
              Assine e use a Lucrivo com os seus produtos por {GUARANTEE_DAYS}{" "}
              dias. Se achar que não vale a pena, é só pedir e devolvemos todo o
              seu dinheiro. Você não precisa explicar o motivo.
            </p>
          </div>
        </div>

        <ol className="guarantee-steps" aria-label="Como a garantia funciona">
          {steps.map(({ title, description }, index) => (
            <li key={title} data-reveal>
              <span className="guarantee-step-index" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>

        <p className="guarantee-footnote">
          Sem letra miúda. Sem pergunta. Sem complicação.
        </p>
      </div>
    </section>
  );
}

export { GuaranteeSection };
