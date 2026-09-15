import Image from "next/image";

import {
  ArrowRightIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatCircleTextIcon,
  CreditCardIcon,
  FactoryIcon,
  PlayCircleIcon,
  StorefrontIcon,
  TableIcon,
} from "@phosphor-icons/react";

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

const businessContexts = [
  { label: "Revenda", icon: StorefrontIcon },
  { label: "Produção própria", icon: FactoryIcon },
  { label: "Prestação de serviço", icon: BriefcaseIcon },
] as const;

function HeroSection() {
  return (
    <section id="top" className="hero-section" aria-labelledby="hero-title">
      <div className="hero-ambient" aria-hidden="true" />

      <div className="hero-layout">
        <div className="hero-copy">
          <p className="hero-kicker hero-copy-reveal">
            <ChartBarIcon aria-hidden="true" size={16} weight="fill" />
            Diagnóstico de preço e rentabilidade
          </p>

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
            Seu preço pode parecer certo e ainda estar fazendo você perder
            dinheiro. Descubra se ele faz sentido para a realidade do seu
            negócio.
          </p>

          <div className="hero-actions hero-copy-reveal">
            <a className="button button-primary" href="/register">
              Fazer diagnóstico gratuito
              <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
            </a>

            <a className="button button-secondary" href="#como-funciona">
              <PlayCircleIcon aria-hidden="true" size={19} weight="bold" />
              Conhecer o Lucrivo
            </a>
          </div>

          <ul
            className="hero-trust hero-copy-reveal"
            aria-label="Vantagens do diagnóstico"
          >
            {trustItems.map(({ title, description, icon: Icon }) => (
              <li key={title}>
                <span className="hero-trust-icon" aria-hidden="true">
                  <Icon size={22} weight="fill" />
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

      <div className="hero-contexts hero-copy-reveal">
        <div className="hero-contexts-label">
          <span aria-hidden="true" />

          <p>Feito para a realidade de quem empreende</p>

          <span aria-hidden="true" />
        </div>

        <ul>
          {businessContexts.map(({ label, icon: Icon }) => (
            <li key={label}>
              <Icon aria-hidden="true" size={24} weight="duotone" />

              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { HeroSection };
