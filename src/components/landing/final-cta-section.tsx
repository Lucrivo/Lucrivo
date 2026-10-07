import {
  ArrowRightIcon,
  CreditCardIcon,
  LightningIcon,
  StackIcon,
} from "@phosphor-icons/react";

import { GuaranteeNote } from "@/components/landing/guarantee-note";
import { GUARANTEE_DAYS } from "@/components/landing/landing-offer";

import "./final-cta-section.css";

const proofItems = [
  { label: "Cartão ou Pix", icon: CreditCardIcon },
  { label: "Acesso liberado na hora", icon: LightningIcon },
  { label: "Todos os seus produtos", icon: StackIcon },
] as const;

function FinalCtaSection({ monthlyPriceLabel }: { monthlyPriceLabel: string }) {
  return (
    <section
      id="diagnostico"
      className="final-cta chapter"
      aria-labelledby="final-cta-title"
    >
      <div className="cta-backdrop" aria-hidden="true">
        <span className="cta-ring" />
        <span className="cta-ring" />
        <span className="cta-ring" />
        <span className="cta-orb cta-orb-a" />
        <span className="cta-orb cta-orb-b" />
      </div>

      <div className="final-cta-inner">
        <p className="final-cta-kicker" data-reveal>
          <span className="final-cta-kicker-dot" aria-hidden="true" />
          Assinatura mensal · Sem fidelidade
        </p>

        <h2 id="final-cta-title" data-reveal>
          Antes de mudar seu preço,
          <br />
          <em>descubra se a conta fecha.</em>
        </h2>

        <p className="final-cta-lead" data-reveal>
          Se você cobra um preço, o Lucrivo pode te ajudar. Assine, use por{" "}
          {GUARANTEE_DAYS} dias e, se não valer a pena, devolvemos tudo.
        </p>

        <div className="final-cta-actions" data-reveal>
          <a className="button button-primary button-large" href="/register">
            Garantir meu acesso por {monthlyPriceLabel}/mês
            <ArrowRightIcon aria-hidden="true" size={20} weight="bold" />
          </a>
          <GuaranteeNote className="final-cta-guarantee">
            <strong>Risco zero por {GUARANTEE_DAYS} dias.</strong> Se não valer
            a pena, você recebe tudo de volta.
          </GuaranteeNote>
        </div>

        <ul
          className="final-cta-proof"
          aria-label="O que está incluso"
          data-reveal
        >
          {proofItems.map(({ label, icon: Icon }) => (
            <li key={label}>
              <Icon aria-hidden="true" size={18} weight="duotone" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { FinalCtaSection };
