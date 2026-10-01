"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CurrencyDollarIcon,
  FactoryIcon,
  HandCoinsIcon,
  ListIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  TargetIcon,
  TrafficSignalIcon,
  UserIcon,
  XIcon,
} from "@phosphor-icons/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { HeroSection } from "@/components/landing/hero-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { BillingPlans } from "@/modules/billing/components/billing-plans";
import type { ActiveBillingPrice } from "@/modules/billing/types";
import methodCalculationImage from "@/public/lp/method-calculation.webp";
import methodInputsImage from "@/public/lp/method-inputs.webp";
import methodReportImage from "@/public/lp/method-report.webp";

import "./landing-experience.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const businessContexts = [
  {
    slug: "resale",
    title: "Eu revendo",
    subtitle: "Você compra pronto e revende.",
    description:
      "Descubra se o preço que você cobra faz sentido, depois de considerar tudo o que sai da sua conta.",
    actionLabel: "Ver planos para quem revende",
    icon: ShoppingBagIcon,
  },
  {
    slug: "production",
    title: "Eu produzo",
    subtitle: "Você transforma matéria-prima em produto.",
    description:
      "Entenda o custo real da produção e encontre um preço que sustente o seu trabalho.",
    actionLabel: "Ver planos para quem produz",
    icon: FactoryIcon,
  },
  {
    slug: "service",
    title: "Eu presto serviço",
    subtitle: "Você vende seu tempo, conhecimento ou trabalho.",
    description:
      "Descubra quanto seu serviço precisa gerar para cobrir seus custos e chegar no resultado que você quer.",
    actionLabel: "Ver planos para quem presta serviço",
    icon: UserIcon,
  },
] as const;

type BusinessContextSlug = (typeof businessContexts)[number]["slug"];

const methodPanels = [
  {
    image: methodInputsImage,
    imageAlt:
      "Bancada de pequeno negócio com calculadora, celular, recibos e embalagem.",
    phase: "Dados",
    report: false,
    facts: [
      {
        title: "Preço",
        description: "O que você cobra hoje.",
        icon: CurrencyDollarIcon,
      },
      {
        title: "Custos",
        description: "O que realmente sai da sua conta.",
        icon: ReceiptIcon,
      },
    ],
  },
  {
    image: methodCalculationImage,
    imageAlt:
      "Calculadora ao lado de camadas organizadas e barras crescentes em tons azuis.",
    phase: "Cálculo",
    report: false,
    facts: [
      {
        title: "Quanto sobra",
        description: "O que fica pra você depois dos custos.",
        icon: HandCoinsIcon,
      },
      {
        title: "Resultado",
        description: "Um preço que faz a conta fechar.",
        icon: TargetIcon,
      },
    ],
  },
  {
    image: methodReportImage,
    imageAlt:
      "Exemplo de relatório do Lucrivo com resultado, prioridades e próximos passos.",
    phase: "Diagnóstico",
    report: true,
    facts: [
      {
        title: "Situação",
        description: "Se o seu preço faz sentido.",
        icon: TrafficSignalIcon,
      },
    ],
  },
] as const;

function BusinessContextVisual({ slug }: { slug: BusinessContextSlug }) {
  if (slug === "resale") {
    return (
      <div className="business-card-visual business-bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (slug === "production") {
    return (
      <div className="business-card-visual business-layers" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className="business-card-visual business-curve" aria-hidden="true">
      <svg viewBox="0 0 420 170" preserveAspectRatio="none">
        <defs>
          <linearGradient id="business-curve-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.24" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="business-curve-area"
          d="M0 156C60 154 79 94 142 92C205 90 218 133 280 123C345 113 349 49 410 42L410 170L0 170Z"
        />
        <path
          className="business-curve-line"
          d="M0 156C60 154 79 94 142 92C205 90 218 133 280 123C345 113 349 49 410 42"
        />
        <circle className="business-curve-pulse" cx="410" cy="42" r="7" />
      </svg>
    </div>
  );
}

const testimonials = [
  {
    quote:
      "Eu vendia bem, mas nunca sabia o que realmente sobrava. O diagnóstico mostrou onde a margem desaparecia.",
    name: "Marina Alves",
    role: "Fundadora de marca autoral",
    image: "https://picsum.photos/seed/lucrivo-marina/360/360",
  },
  {
    quote:
      "Hoje eu consigo negociar desconto sem ansiedade. Sei meu limite e consigo explicar o valor do serviço.",
    name: "Rafael Nunes",
    role: "Consultor independente",
    image: "https://picsum.photos/seed/lucrivo-rafael/360/360",
  },
  {
    quote:
      "A ficha técnica trouxe clareza para a produção e finalmente conectou custo, tempo e preço de venda.",
    name: "Camila Rocha",
    role: "Empreendedora de alimentos",
    image: "https://picsum.photos/seed/lucrivo-camila/360/360",
  },
];

export function LandingExperience({
  prices,
}: {
  prices: ActiveBillingPrice[];
}) {
  const root = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [testimonial, setTestimonial] = useState(0);

  useGSAP(
    () => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) return;

      gsap
        .timeline()
        .from(".hero-copy-reveal", {
          y: 16,
          opacity: 0,
          duration: 0.42,
          stagger: 0.06,
          ease: "power2.out",
        })
        .from(
          ".hero-visual-reveal",
          {
            y: 16,
            opacity: 0,
            duration: 0.48,
            ease: "power2.out",
          },
          "-=0.24",
        );

      gsap
        .timeline({
          scrollTrigger: {
            trigger: ".problem-section",
            start: "top 76%",
            once: true,
          },
        })
        .from(".problem-reveal", {
          y: 14,
          opacity: 0,
          duration: 0.38,
          stagger: 0.06,
          ease: "power2.out",
        });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: ".business-section",
            start: "top 86%",
            once: true,
          },
        })
        .from(".business-heading-reveal, .business-card, .business-question", {
          y: 16,
          opacity: 0,
          duration: 0.42,
          stagger: 0.08,
          ease: "power2.out",
        });

      gsap.from("[data-method-panel]", {
        y: 16,
        opacity: 0,
        duration: 0.42,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".method-panels",
          start: "top 88%",
          once: true,
        },
      });
    },
    { scope: root },
  );

  const nextTestimonial = () => {
    setTestimonial((current) => (current + 1) % testimonials.length);
  };

  const previousTestimonial = () => {
    setTestimonial(
      (current) => (current - 1 + testimonials.length) % testimonials.length,
    );
  };

  return (
    <main
      ref={root}
      data-landing-theme="light"
      className="landing-experience page-shell w-full max-w-full"
    >
      <nav className="nav-wrap" aria-label="Navegação principal">
        <a className="brand" href="#top" aria-label="Lucrivo, início">
          lucrivo<span>.</span>
        </a>

        <div className="desktop-nav">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
        </div>

        <a className="nav-cta" href="#diagnostico">
          Diagnóstico grátis <ArrowUpRightIcon size={16} weight="bold" />
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <XIcon size={22} /> : <ListIcon size={22} />}
        </button>

        {menuOpen && (
          <div className="mobile-nav">
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>
              Como funciona
            </a>
            <a href="#recursos" onClick={() => setMenuOpen(false)}>
              Recursos
            </a>
            <a href="#planos" onClick={() => setMenuOpen(false)}>
              Planos
            </a>
            <a href="#diagnostico" onClick={() => setMenuOpen(false)}>
              Começar grátis
            </a>
          </div>
        )}
      </nav>

      <HeroSection />

      <ProblemSection />

      <section
        id="recursos"
        className="features-section business-section chapter"
        aria-labelledby="business-title"
      >
        <div className="business-shell">
          <header className="business-heading">
            <h2
              id="business-title"
              className="business-heading-reveal"
              aria-label="Você vende, produz ou presta serviço?"
            >
              Você vende, produz
              <br />
              ou <span>presta serviço?</span>
            </h2>
            <p className="business-intro business-heading-reveal">
              Cada tipo de negócio tem uma realidade diferente — custos,
              desafios e formas de chegar no lucro. Mas, no fim, a pergunta que
              importa é a mesma: se o preço que você cobra realmente faz sentido
              para o seu negócio.
            </p>
          </header>

          <div className="business-cards">
            {businessContexts.map(
              ({
                slug,
                title,
                subtitle,
                description,
                actionLabel,
                icon: Icon,
              }) => (
                <a
                  className={`business-card business-card-${slug}`}
                  href="#planos"
                  aria-label={actionLabel}
                  data-business-card={slug}
                  key={slug}
                >
                  <span className="business-card-top">
                    <span className="business-card-icon" aria-hidden="true">
                      <Icon size={30} weight="regular" />
                    </span>
                  </span>

                  <span className="business-card-heading">
                    <span>
                      <strong>{title}</strong>
                      <small>{subtitle}</small>
                    </span>
                    <span className="business-card-arrow" aria-hidden="true">
                      <ArrowRightIcon size={20} weight="bold" />
                    </span>
                  </span>

                  <span className="business-card-description">
                    {description}
                  </span>
                  <BusinessContextVisual slug={slug} />
                </a>
              ),
            )}
          </div>

          <div className="business-question">
            <p>
              <small>O problema é diferente. A pergunta é a mesma:</small>
              <strong>
                o preço que você cobra faz sentido para o seu negócio?
              </strong>
            </p>
          </div>
        </div>
      </section>

      <section
        className="method-section chapter"
        aria-labelledby="method-title"
      >
        <header className="method-heading">
          <p className="method-timing">EM POUCOS MINUTOS</p>
          <h2 id="method-title">
            Seus números viram uma <span>resposta clara.</span>
          </h2>
        </header>

        <div className="method-panels">
          {methodPanels.map(
            ({ image, imageAlt, phase, facts, ...panel }, index) => (
              <article
                className={`method-panel ${panel.report ? "method-panel-report" : ""}`}
                data-method-panel
                key={facts[0].title}
              >
                <figure className="method-panel-media">
                  <div
                    className="method-panel-image-frame"
                    style={{ position: "relative" }}
                  >
                    <Image
                      src={image}
                      alt={imageAlt}
                      fill
                      sizes="(max-width: 860px) calc(100vw - 88px), 46vw"
                      className="method-panel-image"
                    />
                  </div>
                  {panel.report ? (
                    <figcaption>Exemplo de relatório do Lucrivo</figcaption>
                  ) : null}
                </figure>

                <div className="method-panel-content">
                  <div className="method-panel-meta">
                    <span className="method-panel-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="method-panel-phase">{phase}</span>
                  </div>

                  <div className="method-facts">
                    {facts.map(({ title, description, icon: Icon }) => (
                      <div className="method-fact" key={title}>
                        <span className="method-fact-icon" aria-hidden="true">
                          <Icon size={30} weight="regular" />
                        </span>
                        <div>
                          <h3>{title}</h3>
                          <p>{description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {panel.report ? (
                    <p className="method-disclaimer">
                      É uma ferramenta de análise. O resultado depende dos dados
                      que você informar.
                    </p>
                  ) : null}
                </div>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="testimonial-section chapter">
        <div className="testimonial-shell">
          <div className="portrait-stack" aria-hidden="true">
            {testimonials.map((item, index) => (
              <div
                className={`portrait portrait-${index} ${testimonial === index ? "portrait-active" : ""}`}
                key={item.name}
              >
                <Image
                  src={item.image}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width: 720px) 68vw, 390px"
                />
              </div>
            ))}
          </div>
          <div className="testimonial-copy" aria-live="polite">
            <p className="eyebrow">Clareza que muda decisões</p>
            <blockquote>“{testimonials[testimonial].quote}”</blockquote>
            <div className="testimonial-person">
              <strong>{testimonials[testimonial].name}</strong>
              <span>{testimonials[testimonial].role}</span>
            </div>
            <div className="carousel-controls">
              <button
                type="button"
                onClick={previousTestimonial}
                aria-label="Depoimento anterior"
              >
                <ArrowLeftIcon size={20} />
              </button>
              <span>
                {testimonial + 1} / {testimonials.length}
              </span>
              <button
                type="button"
                onClick={nextTestimonial}
                aria-label="Próximo depoimento"
              >
                <ArrowRightIcon size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="pricing-section chapter">
        <div className="section-heading pricing-heading">
          <div>
            <h2>Planos para cada momento do seu negócio.</h2>
            <p>
              Comece gratuitamente ou escolha o acesso que acompanha a rotina e
              o ritmo das suas decisões.
            </p>
          </div>
          <p className="pricing-note">
            Mais clareza para decidir. Sem surpresa na cobrança.
          </p>
        </div>

        <BillingPlans prices={prices} context="public" />
      </section>

      <section id="diagnostico" className="final-cta chapter">
        <div className="cta-noise" />
        <p className="eyebrow">Leva poucos minutos e é gratuito</p>
        <h2>
          Pare de torcer para a conta fechar.
          <br />
          <em>Veja o que os números dizem.</em>
        </h2>
        <p>
          Se você vende, produz ou presta serviços, o Lucrivo pode ajudar. Crie
          sua conta e receba um diagnóstico personalizado, sem cartão.
        </p>
        <a className="button button-primary button-large" href="/register">
          Fazer meu diagnóstico gratuito{" "}
          <ArrowRightIcon size={20} weight="bold" />
        </a>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          lucrivo<span>.</span>
        </a>
        <p>Diagnóstico de preço e rentabilidade para pequenos negócios.</p>
        <div>
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
        </div>
        <small>
          © {new Date().getFullYear()} Lucrivo. Todos os direitos reservados.
        </small>
      </footer>
    </main>
  );
}
