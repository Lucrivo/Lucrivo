import Image from "next/image";

import {
  ArrowRightIcon,
  ChatCircleTextIcon,
  CreditCardIcon,
  TableIcon,
  TagIcon,
} from "@phosphor-icons/react";

import { GuaranteeNote } from "@/components/landing/guarantee-note";
import {
  type LandingOfferPresentation,
  type LaunchOfferView,
} from "@/components/landing/landing-offer";
import { LaunchOfferCallout } from "@/components/landing/launch-offer-callout";
import heroImage from "@/public/lp/hero-image.png";

const trustItems = [
  {
    title: "Sem cartão para começar",
    description: "Faça seu primeiro diagnóstico grátis",
    icon: CreditCardIcon,
  },
  {
    title: "Sem planilhas",
    description: "Deixe os cálculos com o Lucrivo",
    icon: TableIcon,
  },
  {
    title: "Sem falar contabilês",
    description: "Informações claras e fáceis de entender",
    icon: ChatCircleTextIcon,
  },
] as const;

function HeroSection({
  offer,
  launchOffer,
}: {
  offer: LandingOfferPresentation | null;
  launchOffer: LaunchOfferView | null;
}) {
  return (
    <section id="top" className="hero-section" aria-labelledby="hero-title">
      <div className="hero-ambient" aria-hidden="true" />

      <div className="hero-layout">
        <div className="hero-copy">
          <h1
            id="hero-title"
            className="hero-copy-reveal"
            aria-label="Você sabe se o preço que cobra realmente dá lucro?"
          >
            <span>Você sabe se o preço</span>

            <span>
              que cobra <em>realmente</em>
            </span>

            <span>
              <em>dá lucro?</em>
            </span>
          </h1>

          <p className="hero-description hero-copy-reveal">
            Seu preço pode estar errado — e você pode estar perdendo dinheiro
            sem perceber. Descubra se ele faz sentido para a realidade do seu
            negócio.
          </p>

          <div className="hero-actions hero-copy-reveal">
            <a
              className="button button-primary"
              href={offer ? "/register" : "#planos"}
            >
              {offer
                ? `Assinar agora por ${offer.monthlyPriceLabel}/mês`
                : "Conhecer os planos"}
              <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
            </a>

            <a className="button button-secondary" href="#planos">
              <TagIcon aria-hidden="true" size={19} weight="bold" />
              Ver planos
            </a>
          </div>

          {launchOffer ? <LaunchOfferCallout {...launchOffer} /> : null}

          <GuaranteeNote className="hero-guarantee hero-copy-reveal" />

          <ul
            className="hero-trust hero-copy-reveal"
            aria-label="Vantagens do diagnóstico"
          >
            {trustItems.map(({ title, description, icon: Icon }) => (
              <li key={title}>
                <span className="hero-trust-icon" aria-hidden="true">
                  <Icon size={28} weight="fill" />
                </span>

                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <figure className="hero-visual hero-visual-reveal">
          <div className="hero-dashboard-motion">
            <Image
              src={heroImage}
              alt="Painel ilustrativo do Lucrivo com indicadores financeiros."
              width={1448}
              height={1086}
              priority
              sizes="(max-width: 720px) 100vw, (max-width: 1100px) 86vw, 58vw"
              className="hero-dashboard-image"
            />
          </div>
        </figure>
      </div>
    </section>
  );
}

export { HeroSection };
