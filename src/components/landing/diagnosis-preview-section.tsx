"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowRightIcon, SealCheckIcon } from "@phosphor-icons/react";

import "./diagnosis-preview-section.css";

type PreviewTone = "default" | "green" | "blue";

type PreviewCell = {
  label: string;
  value: string;
  tone?: PreviewTone;
};

type PreviewExample = {
  id: string;
  tab: string;
  itemName: string;
  cells: PreviewCell[];
  verdictLabel: string;
  verdictDescription: string;
};

const previewExamples: PreviewExample[] = [
  {
    id: "revenda",
    tab: "Revenda",
    itemName: "Produto revendido",
    cells: [
      { label: "Produto adquirido", value: "R$ 20,00" },
      { label: "Preço cobrado", value: "R$ 39,90" },
      { label: "Quanto sobra", value: "28,5%", tone: "green" },
      { label: "Preço sugerido", value: "R$ 39,90", tone: "blue" },
    ],
    verdictLabel: "Resultado positivo",
    verdictDescription:
      "Com os valores informados, o resultado estimado do mês ficou positivo.",
  },
  {
    id: "producao",
    tab: "Produção",
    itemName: "Produto produzido",
    cells: [
      { label: "Custo total", value: "R$ 18,00" },
      { label: "Preço cobrado", value: "R$ 42,00" },
      { label: "Quanto sobra", value: "31,0%", tone: "green" },
      { label: "Preço sugerido", value: "R$ 42,00", tone: "blue" },
    ],
    verdictLabel: "Resultado positivo",
    verdictDescription:
      "O preço cobre o custo de produção e o resultado do mês fica positivo.",
  },
  {
    id: "servico",
    tab: "Serviço",
    itemName: "Serviço prestado",
    cells: [
      { label: "Custo por hora", value: "R$ 28,00" },
      { label: "Preço cobrado", value: "R$ 60,00 / h" },
      { label: "Quanto sobra", value: "34,2%", tone: "green" },
      { label: "Preço sugerido", value: "R$ 60,00 / h", tone: "blue" },
    ],
    verdictLabel: "Resultado positivo",
    verdictDescription:
      "O que você cobra pela hora cobre os custos e o resultado fica positivo.",
  },
];

const previewPoints = [
  {
    title: "O preço cobre os custos?",
    description: "Você vê, em número, se o que você cobra dá conta do que sai.",
  },
  {
    title: "Quanto sobra depois de considerar os custos?",
    description: "O que fica pra você em cada venda ou atendimento.",
  },
  {
    title: "Faz sentido continuar assim?",
    description: "E, se não, qual preço faria a conta fechar.",
  },
] as const;

function DiagnosisPreviewSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = previewExamples[activeIndex];

  function focusTab(index: number) {
    const next = (index + previewExamples.length) % previewExamples.length;
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(previewExamples.length - 1);
    }
  }

  return (
    <section
      id="previa"
      className="preview-section chapter"
      aria-labelledby="preview-title"
    >
      <div className="preview-layout">
        <div className="preview-card" data-reveal>
          <div className="preview-card-bar" aria-hidden="true">
            <span className="preview-dot preview-dot-red" />
            <span className="preview-dot preview-dot-amber" />
            <span className="preview-dot preview-dot-green" />
            <span className="preview-card-bar-title">Seu diagnóstico</span>
          </div>

          <div
            className="preview-tabs"
            role="tablist"
            aria-label="Tipo de negócio no exemplo"
          >
            {previewExamples.map((example, index) => {
              const selected = index === activeIndex;

              return (
                <button
                  key={example.id}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  id={`preview-tab-${example.id}`}
                  className={`preview-tab ${selected ? "is-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`preview-panel-${example.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveIndex(index)}
                  onKeyDown={handleTabKeyDown}
                >
                  {example.tab}
                </button>
              );
            })}
          </div>

          <div
            id={`preview-panel-${active.id}`}
            className="preview-body"
            role="tabpanel"
            aria-labelledby={`preview-tab-${active.id}`}
          >
            <p className="preview-item">
              <span>Item analisado</span>
              <strong>{active.itemName}</strong>
            </p>

            <dl className="preview-grid">
              {active.cells.map(({ label, value, tone = "default" }) => (
                <div
                  className={`preview-cell preview-cell-${tone}`}
                  key={label}
                >
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="preview-verdict">
              <p className="preview-verdict-label">
                <SealCheckIcon aria-hidden="true" size={20} weight="fill" />
                {active.verdictLabel}
              </p>
              <p>{active.verdictDescription}</p>
            </div>

            <p className="preview-note">
              Exemplo ilustrativo com números fictícios.
            </p>
          </div>
        </div>

        <div className="preview-copy">
          <p className="eyebrow">Uma prévia real</p>
          <h2 id="preview-title">É assim que o seu diagnóstico chega.</h2>
          <p className="preview-lead">
            Não importa se você revende, produz ou presta serviço — o resultado
            responde a mesma coisa, do seu jeito:
          </p>

          <ol className="preview-points">
            {previewPoints.map(({ title, description }, index) => (
              <li key={title} data-reveal>
                <span className="preview-point-index" aria-hidden="true">
                  {index + 1}
                </span>
                <p>
                  <strong>{title}</strong> {description}
                </p>
              </li>
            ))}
          </ol>

          <a className="button button-primary" href="/register">
            Quero ver isso no meu negócio
            <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
          </a>
        </div>
      </div>
    </section>
  );
}

export { DiagnosisPreviewSection };
