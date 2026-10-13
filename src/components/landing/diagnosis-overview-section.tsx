import {
  ChartPieSliceIcon,
  CurrencyCircleDollarIcon,
  ReceiptIcon,
  TargetIcon,
  TrafficSignalIcon,
} from "@phosphor-icons/react";

import "./diagnosis-overview-section.css";

const overviewItems = [
  {
    title: "Preço",
    description: "O que você cobra hoje.",
    icon: CurrencyCircleDollarIcon,
  },
  {
    title: "Custos",
    description: "O que realmente sai da sua conta.",
    icon: ReceiptIcon,
  },
  {
    title: "Quanto sobra",
    description: "O que fica pra você depois dos custos.",
    icon: ChartPieSliceIcon,
  },
  {
    title: "Resultado",
    description: "Um preço que faz a conta fechar.",
    icon: TargetIcon,
  },
  {
    title: "Situação",
    description: "Se o seu preço faz sentido.",
    icon: TrafficSignalIcon,
  },
] as const;

function DiagnosisOverviewSection() {
  return (
    <section
      id="diagnostico-resumo"
      className="overview-section chapter"
      aria-labelledby="overview-title"
    >
      <div className="section-heading">
        <p className="eyebrow">Em poucos minutos</p>
        <h2 id="overview-title">Seus números viram uma resposta clara.</h2>
      </div>

      <ol className="overview-grid" aria-label="O que o diagnóstico mostra">
        {overviewItems.map(({ title, description, icon: Icon }, index) => (
          <li className="overview-card" data-reveal key={title}>
            <span className="overview-card-icon" aria-hidden="true">
              <Icon size={28} weight="duotone" />
            </span>
            <span className="overview-card-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>

      <p className="overview-disclaimer">
        É uma ferramenta de análise. O resultado depende dos dados que você
        informar.
      </p>
    </section>
  );
}

export { DiagnosisOverviewSection };
