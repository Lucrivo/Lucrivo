import Image from "next/image";

import {
  ArrowRightIcon,
  ChatCircleTextIcon,
  CreditCardIcon,
  TableIcon,
} from "@phosphor-icons/react";

import { GuaranteeNote } from "@/components/landing/guarantee-note";
import { HeroVideoDialog } from "@/components/landing/hero-video-dialog";
import { type LandingOfferPresentation } from "@/components/landing/landing-offer";
import heroImage from "@/assets/landing/hero-image-v2.png";

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
  videoUrl,
}: {
  offer: LandingOfferPresentation | null;
  videoUrl?: string | null;
}) {
  const primaryAction = offer
    ? offer.monthlyPriceQualifier
      ? `Assinar por ${offer.monthlyPriceLabel} no primeiro pagamento`
      : `Assinar agora por ${offer.monthlyPriceLabel}/mês`
    : "Conhecer os planos";

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
              {primaryAction}
              <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
            </a>

            <HeroVideoDialog videoUrl={videoUrl} />
          </div>

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
              alt="Exemplo de relatório do Lucrivo com resultado e orientações financeiras."
              width={1448}
              height={1086}
              priority
              sizes="(max-width: 720px) 100vw, (max-width: 911px) 90vw, (max-width: 1160px) 820px, 52vw"
              className="hero-dashboard-image"
            />
          </div>
          <figcaption className="hero-visual-caption">
            Exemplo ilustrativo com dados fictícios.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export { HeroSection };
