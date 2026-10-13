import {
  BriefcaseIcon,
  FactoryIcon,
  ShoppingBagIcon,
} from "@phosphor-icons/react";

import "./business-paths-section.css";

const businessPaths = [
  {
    slug: "resale",
    title: "Eu revendo",
    role: "Você compra pronto e revende.",
    description:
      "Descubra se o preço que você cobra faz sentido, depois de considerar tudo o que sai da sua conta.",
    icon: ShoppingBagIcon,
  },
  {
    slug: "production",
    title: "Eu produzo",
    role: "Você transforma matéria-prima em produto.",
    description:
      "Entenda o custo real da produção e encontre um preço que sustente o seu trabalho.",
    icon: FactoryIcon,
  },
  {
    slug: "service",
    title: "Eu presto serviço",
    role: "Você vende seu tempo, conhecimento ou trabalho.",
    description:
      "Descubra quanto seu serviço precisa gerar pra cobrir seus custos e chegar no resultado que você quer.",
    icon: BriefcaseIcon,
  },
] as const;

function BusinessPathsSection() {
  return (
    <section
      id="caminhos"
      className="paths-section chapter"
      aria-labelledby="paths-title"
    >
      <div className="section-heading section-heading-dark">
        <p className="eyebrow">O Lucrivo se adapta ao que você faz</p>
        <h2 id="paths-title">Você vende, produz ou presta serviço?</h2>
      </div>

      <div className="paths-grid">
        {businessPaths.map(
          ({ slug, title, role, description, icon: Icon }, index) => (
            <article
              className={`path-card path-card-${slug}`}
              data-path={slug}
              data-reveal
              key={slug}
            >
              <div className="path-card-meta">
                <span className="path-card-icon" aria-hidden="true">
                  <Icon size={30} weight="duotone" />
                </span>
                <span className="path-card-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <h3>{title}</h3>
              <p className="path-card-role">{role}</p>
              <p className="path-card-description">{description}</p>
            </article>
          ),
        )}
      </div>

      <p className="paths-statement" data-reveal>
        O problema é diferente. A pergunta é a mesma:
        <br />
        <strong>o preço que você cobra faz sentido para o seu negócio?</strong>
      </p>
    </section>
  );
}

export { BusinessPathsSection };
