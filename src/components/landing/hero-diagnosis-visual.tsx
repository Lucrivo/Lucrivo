import {
  CircleCheckBigIcon,
  PackageCheckIcon,
  ReceiptTextIcon,
} from "lucide-react";

import { diagnosisExamples } from "@/components/landing/landing-data";

const example = diagnosisExamples[0];

const revealStyle = (delay: number) => ({
  animationDelay: `${delay}ms`,
});

function ReconciliationLine() {
  return (
    <div className="relative h-14 sm:h-16" aria-hidden="true">
      <svg
        viewBox="0 0 640 64"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
      >
        <path
          d="M80 2v12c0 10 9 18 20 18h220M560 2v12c0 10-9 18-20 18H320v30"
          fill="none"
          stroke="var(--border)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M80 2v12c0 10 9 18 20 18h220M560 2v12c0 10-9 18-20 18H320v30"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="1"
          vectorEffect="non-scaling-stroke"
          className="motion-safe:animate-chart-line"
          style={revealStyle(520)}
        />
        <circle
          cx="80"
          cy="2"
          r="4"
          fill="var(--primary)"
          stroke="var(--card)"
          strokeWidth="2"
          className="motion-safe:animate-chart-point origin-center [transform-box:fill-box]"
          style={revealStyle(500)}
        />
        <circle
          cx="560"
          cy="2"
          r="4"
          fill="var(--primary)"
          stroke="var(--card)"
          strokeWidth="2"
          className="motion-safe:animate-chart-point origin-center [transform-box:fill-box]"
          style={revealStyle(680)}
        />
        <circle
          cx="320"
          cy="62"
          r="5"
          fill="var(--primary)"
          stroke="var(--card)"
          strokeWidth="2"
          className="motion-safe:animate-chart-point origin-center [transform-box:fill-box]"
          style={revealStyle(940)}
        />
      </svg>
    </div>
  );
}

function HeroDiagnosisVisual() {
  return (
    <figure className="mx-auto w-full max-w-2xl lg:max-w-none">
      <div className="bg-card text-card-foreground overflow-hidden rounded-2xl border shadow-lg">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <ReceiptTextIcon aria-hidden="true" className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                Diagnóstico do preço
              </p>
              <p className="text-muted-foreground truncate text-xs">
                Visão resumida
              </p>
            </div>
          </div>

          <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
            {example.tabLabel}
          </span>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2 sm:mb-5">
            <PackageCheckIcon
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
            />
            <p className="text-muted-foreground text-xs">
              Item analisado
              <span className="text-foreground ml-1.5 font-medium">
                {example.item}
              </span>
            </p>
          </div>

          <dl className="grid grid-cols-2 overflow-hidden rounded-xl border">
            <div
              className="motion-safe:animate-float-in min-w-0 border-r p-3.5 sm:p-4"
              style={revealStyle(100)}
            >
              <dt className="text-muted-foreground text-[0.6875rem] leading-tight font-medium tracking-wide uppercase sm:text-xs">
                Preço cobrado
              </dt>
              <dd className="mt-2 truncate text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">
                {example.price}
              </dd>
            </div>

            <div
              className="motion-safe:animate-float-in min-w-0 p-3.5 sm:p-4"
              style={revealStyle(300)}
            >
              <dt className="text-muted-foreground text-[0.6875rem] leading-tight font-medium tracking-wide uppercase sm:text-xs">
                {example.costLabel}
              </dt>
              <dd className="mt-2 truncate text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">
                {example.costValue}
              </dd>
            </div>

            <div
              className="bg-muted/45 motion-safe:animate-float-in col-span-2 border-t px-3.5 py-2.5 sm:px-4"
              style={revealStyle(430)}
            >
              <dt className="sr-only">Demais custos considerados</dt>
              <dd className="text-muted-foreground flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
                <span>Demais custos considerados</span>
                <span className="text-foreground font-medium">
                  Impostos, taxas e estrutura
                </span>
              </dd>
            </div>
          </dl>

          <ReconciliationLine />

          <dl className="grid gap-2.5 sm:grid-cols-[1.05fr_1fr_1fr] sm:gap-3">
            <div
              className="border-primary/25 bg-primary/6 motion-safe:animate-float-in min-w-0 rounded-xl border p-4"
              style={revealStyle(900)}
            >
              <dt className="text-accent-foreground text-xs font-medium">
                Quanto sobra
              </dt>
              <dd>
                <span className="text-foreground mt-1.5 block text-3xl font-semibold tracking-tight tabular-nums">
                  {example.remainder}
                </span>
                <span className="text-muted-foreground mt-1 block text-[0.6875rem] leading-relaxed">
                  Margem após todos os custos considerados
                </span>
              </dd>
            </div>

            <div
              className="bg-muted/45 motion-safe:animate-float-in min-w-0 rounded-xl border p-4"
              style={revealStyle(1120)}
            >
              <dt className="text-muted-foreground text-xs font-medium">
                Preço sugerido
              </dt>
              <dd>
                <span className="mt-2 block text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                  {example.suggestedPrice}
                </span>
                <span className="text-muted-foreground mt-1 block text-[0.6875rem] leading-relaxed">
                  Para este cenário
                </span>
              </dd>
            </div>

            <div
              className="bg-success/10 border-success/25 motion-safe:animate-float-in min-w-0 rounded-xl border p-4"
              style={revealStyle(1320)}
            >
              <dt className="text-foreground/70 text-xs font-medium">
                Situação
              </dt>
              <dd>
                <span className="text-foreground mt-2 flex items-center gap-2 text-lg font-semibold">
                  <CircleCheckBigIcon
                    aria-hidden="true"
                    className="text-success size-5 shrink-0"
                  />
                  {example.status}
                </span>
                <span className="text-muted-foreground mt-1 block text-[0.6875rem] leading-relaxed">
                  O preço cobre os custos
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <figcaption className="mt-3 px-1 text-center sm:text-left">
        Exemplo ilustrativo com números fictícios. O cálculo completo também
        considera impostos, taxas e estrutura.
      </figcaption>
    </figure>
  );
}

export { HeroDiagnosisVisual };
