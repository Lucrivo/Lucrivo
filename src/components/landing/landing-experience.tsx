"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ListIcon,
  XIcon,
} from "@phosphor-icons/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import "./landing-experience.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const featurePanels = [
  {
    title: "Preço sem achismo",
    description:
      "Veja se o que você cobra dá conta de tudo o que sai e ainda deixa o resultado que o negócio precisa.",
    image: "https://picsum.photos/seed/lucrivo-atelier/1200/900",
  },
  {
    title: "Desconto sob controle",
    description:
      "Simule cenários antes de negociar e veja até onde é possível ir sem transformar venda em prejuízo.",
    image: "https://picsum.photos/seed/lucrivo-retail/1200/900",
  },
  {
    title: "Produção bem calculada",
    description:
      "Entenda o custo real da produção e encontre um preço que sustente o seu trabalho.",
    image: "https://picsum.photos/seed/lucrivo-workshop/1200/900",
  },
  {
    title: "Orientação que faz sentido",
    description:
      "A IA interpreta o cálculo e mostra o que precisa de atenção, sem planilha e sem falar contabilês.",
    image: "https://picsum.photos/seed/lucrivo-consulting/1200/900",
  },
];

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

const plans = [
  {
    name: "Diagnóstico",
    price: "Grátis",
    description:
      "Para descobrir se o preço que você cobra faz sentido para o seu negócio.",
    features: [
      "Diagnóstico guiado em poucos minutos",
      "Leitura da margem real",
      "Preço mínimo e preço-alvo",
      "Prioridade de correção",
    ],
    cta: "Fazer diagnóstico",
  },
  {
    name: "Lucrivo Pro",
    price: "Acesso mensal",
    description: "Para usar o Lucrivo nas decisões recorrentes do negócio.",
    features: [
      "Diagnósticos recorrentes",
      "Simulações de preço e desconto",
      "Análise de múltiplos produtos",
      "Relatórios interpretados por IA",
    ],
    cta: "Começar gratuitamente",
    featured: true,
  },
  {
    name: "Lucrivo Negócio",
    price: "Acesso avançado",
    description: "Para operações que precisam analisar produção e portfólio.",
    features: [
      "Tudo do plano Pro",
      "Ficha técnica de produção",
      "Visão consolidada do portfólio",
      "Histórico para decisões futuras",
    ],
    cta: "Conhecer o plano",
  },
];

export function LandingExperience() {
  const root = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [testimonial, setTestimonial] = useState(0);

  useGSAP(
    () => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) return;

      gsap.from(".hero-reveal", {
        y: 48,
        opacity: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: "power3.out",
      });

      gsap.utils.toArray<HTMLElement>(".word-reveal").forEach((section) => {
        const words = section.querySelectorAll("span");
        gsap.fromTo(
          words,
          { opacity: 0.12 },
          {
            opacity: 1,
            stagger: 0.05,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 76%",
              end: "bottom 42%",
              scrub: 1,
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".scroll-visual").forEach((visual) => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: visual,
              start: "top 92%",
              end: "bottom 8%",
              scrub: 1.1,
            },
          })
          .fromTo(
            visual,
            { scale: 0.8, opacity: 0.38 },
            { scale: 1, opacity: 1, ease: "none", duration: 0.55 },
          )
          .to(visual, {
            scale: 0.96,
            opacity: 0.22,
            ease: "none",
            duration: 0.45,
          });
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
      className="landing-experience page-shell w-full max-w-full overflow-x-hidden"
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

      <section id="top" className="hero-section">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-copy">
          <p className="hero-kicker hero-reveal">
            Diagnóstico de preço e rentabilidade
          </p>
          <h1 className="hero-reveal max-w-[1120px]">
            <span className="hero-line">Você sabe se o preço que</span>
            <span className="hero-line">
              cobra <em>realmente dá lucro?</em>
            </span>
          </h1>
          <p className="hero-description hero-reveal">
            Seu preço pode estar errado — e você pode estar perdendo dinheiro
            sem perceber. Descubra se ele faz sentido para a realidade do seu
            negócio
          </p>
          <div className="hero-actions hero-reveal">
            <a className="button button-primary" href="#diagnostico">
              Fazer meu diagnóstico gratuito
              <ArrowRightIcon size={18} weight="bold" />
            </a>
            <a className="button button-secondary" href="#como-funciona">
              Entender o Lucrivo <ArrowDownIcon size={18} weight="bold" />
            </a>
          </div>
        </div>

        <div
          className="hero-product hero-reveal scroll-visual"
          aria-label="Prévia do diagnóstico Lucrivo"
        >
          <div className="product-bar">
            <span>Seu diagnóstico</span>
            <span className="product-status">Resultado personalizado</span>
          </div>
          <div className="product-focus">
            <span>Leitura principal</span>
            <strong>Sua margem precisa de atenção.</strong>
            <p>
              Sobra pouco depois de considerar os seus custos. Vale ajustar o
              preço antes de continuar.
            </p>
          </div>
          <div className="product-row">
            <div>
              <span>Preço</span>
              <strong>Informado</strong>
            </div>
            <div>
              <span>Custos</span>
              <strong>Calculados</strong>
            </div>
            <div>
              <span>Situação</span>
              <strong>Atenção</strong>
            </div>
          </div>
        </div>

        <a
          className="hero-scroll"
          href="#como-funciona"
          aria-label="Ir para a próxima seção"
        >
          Role para descobrir <ArrowDownIcon size={16} />
        </a>
      </section>

      <section id="como-funciona" className="light-section chapter">
        <div className="section-heading">
          <p className="eyebrow">Antes de mudar o preço</p>
          <h2>
            Seus números viram uma resposta.
            <br />
            Você entende o caminho.
          </h2>
        </div>

        <div className="diagnostic-bento">
          <article className="bento-card bento-wide bento-dark">
            <div>
              <p className="card-label">Margem real</p>
              <h3>Veja quanto sobra depois de considerar todos os custos.</h3>
            </div>
            <div className="margin-graph" aria-hidden="true">
              <span style={{ height: "38%" }} />
              <span style={{ height: "52%" }} />
              <span style={{ height: "68%" }} />
              <span className="active" style={{ height: "86%" }} />
            </div>
          </article>

          <article className="bento-card bento-narrow bento-lime">
            <p className="card-label">Preço-alvo</p>
            <div className="target-ring">
              <span>equilíbrio</span>
            </div>
            <h3>Um preço que faz a conta fechar e cabe o seu lucro.</h3>
          </article>

          <article className="bento-card bento-third bento-paper">
            <p className="card-label">Ponto de equilíbrio</p>
            <h3>Saiba quanto precisa vender para sair do zero.</h3>
            <div className="balance-line">
              <span />
            </div>
          </article>

          <article className="bento-card bento-third bento-green">
            <p className="card-label">Desconto seguro</p>
            <h3>Negocie olhando para o impacto, não para o impulso.</h3>
            <div className="discount-control">
              <span />
              <i />
            </div>
          </article>

          <article className="bento-card bento-third bento-image">
            <div className="bento-image-photo" />
            <div className="bento-image-copy">
              <p className="card-label">Orientação prática</p>
              <h3>O cálculo aponta. A IA explica.</h3>
            </div>
          </article>
        </div>
      </section>

      <section className="statement-section">
        <p className="word-reveal statement-copy">
          {"Preço não é só colocar um número. Para revenda, produção ou serviço, ele precisa considerar custos, impostos, taxas, estrutura, tempo de trabalho e o quanto você quer ganhar."
            .split(" ")
            .map((word, index) => (
              <span key={`${word}-${index}`}>{word} </span>
            ))}
        </p>
      </section>

      <section id="recursos" className="features-section chapter">
        <div className="section-heading section-heading-light">
          <p className="eyebrow">O Lucrivo se adapta ao que você faz</p>
          <h2>Você vende, produz ou presta serviço?</h2>
          <p>
            O problema é diferente. A pergunta é a mesma: o preço que você cobra
            faz sentido para o seu negócio?
          </p>
        </div>

        <div className="horizontal-accordion">
          {featurePanels.map((feature, index) => (
            <button
              type="button"
              className={`feature-panel ${activeFeature === index ? "is-active" : ""}`}
              key={feature.title}
              onMouseEnter={() => setActiveFeature(index)}
              onFocus={() => setActiveFeature(index)}
              onClick={() => setActiveFeature(index)}
              aria-expanded={activeFeature === index}
            >
              <Image
                src={feature.image}
                alt=""
                fill
                unoptimized
                loading={index === 0 ? "eager" : "lazy"}
                sizes="(max-width: 720px) 100vw, 60vw"
              />
              <span className="feature-shade" />
              <span className="feature-index">0{index + 1}</span>
              <span className="feature-copy">
                <strong>{feature.title}</strong>
                <span>{feature.description}</span>
              </span>
              <ArrowUpRightIcon className="feature-arrow" size={22} />
            </button>
          ))}
        </div>
      </section>

      <section className="method-section chapter">
        <div className="method-layout">
          <div className="method-title">
            <p className="eyebrow">Três passos. Poucos minutos.</p>
            <h2>
              O motor calcula.
              <br />A inteligência interpreta.
            </h2>
          </div>
          <div className="method-steps">
            <article className="scroll-visual">
              <span>01</span>
              <div>
                <h3>Informe os dados</h3>
                <p>
                  Responda perguntas simples sobre o que você cobra e o que
                  gasta, uma de cada vez.
                </p>
              </div>
            </article>
            <article className="scroll-visual">
              <span>02</span>
              <div>
                <h3>Nós calculamos</h3>
                <p>
                  O motor financeiro faz as contas por você e mostra tudo
                  pronto, sem planilha e sem termo difícil.
                </p>
              </div>
            </article>
            <article className="scroll-visual">
              <span>03</span>
              <div>
                <h3>Veja seu diagnóstico</h3>
                <p>
                  Descubra se o seu preço faz sentido e o que precisa ser
                  corrigido primeiro.
                </p>
              </div>
            </article>
          </div>
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
          <p className="eyebrow">Comece pela resposta que importa</p>
          <h2>Primeiro, descubra. Depois, evolua.</h2>
          <p>
            Faça o diagnóstico inicial gratuitamente. Quando o Lucrivo passar a
            fazer parte da rotina, escolha o acesso que acompanha seu negócio.
          </p>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <article
              className={`price-card ${plan.featured ? "price-featured" : ""}`}
              key={plan.name}
            >
              <div>
                <p className="plan-name">{plan.name}</p>
                <h3>{plan.price}</h3>
                <p className="plan-description">{plan.description}</p>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckIcon size={17} weight="bold" /> {feature}
                  </li>
                ))}
              </ul>
              <a
                className={`button ${plan.featured ? "button-primary" : "button-dark"}`}
                href="#diagnostico"
              >
                {plan.cta} <ArrowUpRightIcon size={17} weight="bold" />
              </a>
            </article>
          ))}
        </div>
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
