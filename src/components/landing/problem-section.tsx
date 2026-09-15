import {
  BriefcaseIcon,
  BuildingsIcon,
  ClockIcon,
  CoinsIcon,
  CreditCardIcon,
  FactoryIcon,
  HandCoinsIcon,
  ReceiptIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";

const businessContexts = [
  { label: "Revenda", icon: StorefrontIcon },
  { label: "Produção própria", icon: FactoryIcon },
  { label: "Prestação de serviço", icon: BriefcaseIcon },
] as const;

const pricingFactors = [
  {
    slug: "costs",
    title: "Custos",
    description: "Tudo que sai para o produto ou serviço existir.",
    closing: "Na ponta do lápis",
    tone: "ink",
    icon: CoinsIcon,
  },
  {
    slug: "taxes",
    title: "Impostos",
    description: "A fatia que vai embora em cada venda.",
    closing: "Menos surpresas",
    tone: "blue",
    icon: ReceiptIcon,
  },
  {
    slug: "fees",
    title: "Taxas",
    description: "Cartão, app, marketplace — descontam sem avisar.",
    closing: "Fique no controle",
    tone: "paper",
    icon: CreditCardIcon,
  },
  {
    slug: "time",
    title: "Tempo",
    description: "Seu trabalho e suas horas também têm valor.",
    closing: "Valorize o seu tempo",
    tone: "navy",
    icon: ClockIcon,
  },
  {
    slug: "structure",
    title: "Estrutura",
    description: "Aluguel, luz, sistema: o custo de manter tudo de pé.",
    closing: "Conta o ano todo",
    tone: "paper",
    icon: BuildingsIcon,
  },
  {
    slug: "earnings",
    title: "O quanto você quer ganhar",
    description: "O preço tem que caber o seu lucro também.",
    closing: "Crescimento de verdade",
    tone: "blue",
    icon: HandCoinsIcon,
  },
] as const;

type FactorSlug = (typeof pricingFactors)[number]["slug"];

function FactorVisual({ slug }: { slug: FactorSlug }) {
  if (slug === "costs") {
    return (
      <div className="problem-visual problem-visual-costs" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (slug === "taxes") {
    return (
      <div className="problem-visual problem-visual-taxes" aria-hidden="true">
        <span />
        <i />
      </div>
    );
  }

  if (slug === "fees") {
    return (
      <div className="problem-visual problem-visual-fees" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (slug === "time") {
    return (
      <div className="problem-visual problem-visual-time" aria-hidden="true">
        <span />
        <i />
      </div>
    );
  }

  if (slug === "structure") {
    return (
      <div
        className="problem-visual problem-visual-structure"
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className="problem-visual problem-visual-earnings" aria-hidden="true">
      <span />
      <i />
    </div>
  );
}

function ProblemSection() {
  return (
    <section
      id="como-funciona"
      className="problem-section"
      aria-labelledby="problem-title"
    >
      <div className="problem-bridge problem-reveal">
        <div className="problem-contexts">
          <div className="problem-contexts-label">
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

        <p className="problem-bridge-statement">
          Antes de mudar seu preço, descubra se a conta fecha.
        </p>
      </div>

      <div className="problem-content chapter">
        <header className="problem-heading problem-reveal">
          <p className="eyebrow">O problema</p>
          <h2 id="problem-title">Preço não é só colocar um número.</h2>
          <p>
            O preço precisa fazer sentido para a realidade do seu negócio. Estes
            são os pontos que costumam mudar tudo — e que quase ninguém coloca
            na conta.
          </p>
        </header>

        <div className="problem-bento">
          {pricingFactors.map(
            (
              { slug, title, description, closing, tone, icon: Icon },
              index,
            ) => (
              <article
                className={`problem-card problem-card-${slug} problem-card-${tone}`}
                key={slug}
              >
                <div className="problem-card-meta">
                  <span className="problem-card-icon" aria-hidden="true">
                    <Icon size={30} weight="duotone" />
                  </span>
                  <span className="problem-card-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="problem-card-copy">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>

                <FactorVisual slug={slug} />
                <p className="problem-card-closing">{closing}</p>
              </article>
            ),
          )}

          <div className="problem-conclusion">
            <div className="problem-conclusion-primary">
              <p className="problem-conclusion-label">Preço com inteligência</p>
              <h3>
                Quando você considera todos os pontos, o preço trabalha a seu
                favor.
              </h3>
              <p>
                Mais margem, mais previsibilidade e um negócio que cresce de
                forma saudável.
              </p>
            </div>

            <div className="problem-conclusion-secondary">
              <div className="problem-conclusion-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div>
                <p className="problem-conclusion-label">Do caos ao controle</p>
                <h3>Preço certo abre caminhos.</h3>
                <p>E a Lucrivo te ajuda a chegar lá.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { ProblemSection };
