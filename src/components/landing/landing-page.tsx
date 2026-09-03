import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
} from "lucide-react";

import logo from "@/public/brand/logo.png";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { DiagnosisShowcase } from "./diagnosis-showcase";
import { HeroDiagnosisVisual } from "./hero-diagnosis-visual";
import { businessContexts, howItWorks, pricingFactors } from "./landing-data";

const primaryCtaClassName = cn(
  buttonVariants({ size: "lg" }),
  "bg-accent-foreground text-background hover:bg-accent-foreground h-12 w-full px-3 text-sm shadow-md [background-image:none] motion-reduce:transform-none sm:w-auto sm:px-6 sm:text-base",
);

const statusItems = [
  {
    title: "Saudável",
    description: "O preço cobre os custos e ainda deixa um bom resultado.",
    icon: CircleCheckIcon,
    badgeVariant: "success" as const,
    accentClassName: "bg-success",
  },
  {
    title: "Atenção",
    description: "Sobra pouco. Vale revisar antes de continuar.",
    icon: CircleAlertIcon,
    badgeVariant: "warning" as const,
    accentClassName: "bg-warning",
  },
  {
    title: "Risco",
    description: "O preço pode não estar cobrindo os custos do seu negócio.",
    icon: CircleXIcon,
    badgeVariant: "destructive" as const,
    accentClassName: "bg-destructive",
  },
] as const;

function Brand() {
  return (
    <Link
      href="/"
      aria-label="Lucrivo — página inicial"
      className="focus-visible:ring-ring/30 inline-flex items-center gap-2.5 rounded-lg focus-visible:ring-3 focus-visible:outline-none"
    >
      <span className="flex size-9 items-center justify-center overflow-hidden rounded-lg border bg-white p-1 shadow-xs sm:size-10">
        <Image
          src={logo}
          alt=""
          width={40}
          height={40}
          className="size-full object-cover"
          priority
          sizes="40px"
        />
      </span>
      <span className="text-lg font-semibold tracking-tight sm:text-xl">
        Lucrivo
      </span>
    </Link>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "center",
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}
    >
      <p className="text-accent-foreground text-xs font-semibold tracking-[0.18em] uppercase">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-3 text-3xl leading-tight font-semibold sm:text-4xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-50 border-b backdrop-blur-xl">
      <nav
        aria-label="Navegação principal"
        className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-[4.5rem] sm:px-6 lg:px-8"
      >
        <Brand />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-10 px-2.5 sm:px-3",
            )}
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-accent-foreground text-background hover:bg-accent-foreground h-10 [background-image:none] px-3 sm:px-4",
            )}
          >
            <span className="sm:hidden">Começar grátis</span>
            <span className="hidden sm:inline">Fazer diagnóstico gratuito</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  const trustItems = [
    "Sem cartão para começar",
    "Sem planilhas",
    "Sem falar contabilês",
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden pt-14 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-28"
    >
      <div
        aria-hidden="true"
        className="border-primary/10 absolute top-12 left-1/2 -z-10 hidden h-96 w-px border-l border-dashed lg:block"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        <div className="animate-fade-up max-w-2xl motion-reduce:animate-none">
          <Badge
            variant="info"
            className="text-accent-foreground mb-5 h-7 px-3"
          >
            Diagnóstico gratuito de preço
          </Badge>
          <h1
            id="hero-title"
            className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] font-semibold tracking-[-0.045em]"
          >
            Você sabe se o preço que cobra{" "}
            <span className="text-primary">realmente dá lucro?</span>
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">
            Seu preço pode estar errado — e você pode estar perdendo dinheiro
            sem perceber. Descubra se ele faz sentido para a realidade do seu
            negócio.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link href="/register" className={primaryCtaClassName}>
              Fazer meu diagnóstico gratuito
              <ArrowRightIcon aria-hidden="true" />
            </Link>
            <span className="text-muted-foreground text-sm">
              Resultado personalizado
            </span>
          </div>
          <ul className="text-muted-foreground mt-7 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5">
            {trustItems.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="text-primary size-4 shrink-0"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroDiagnosisVisual />
      </div>
    </section>
  );
}

function PriceAnatomySection() {
  return (
    <section
      aria-labelledby="price-anatomy-title"
      className="bg-card/65 border-y py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-accent-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            O que entra na conta
          </p>
          <h2
            id="price-anatomy-title"
            className="mt-3 text-3xl leading-tight font-semibold sm:text-4xl"
          >
            Preço não é só colocar um número.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg text-base leading-relaxed sm:text-lg">
            O preço precisa fazer sentido para a realidade do seu negócio. São
            detalhes que costumam mudar tudo — e que muita gente deixa fora da
            conta.
          </p>
        </div>

        <ol className="bg-background overflow-hidden rounded-2xl border shadow-sm md:grid md:grid-cols-2">
          {pricingFactors.map((factor, index) => {
            const Icon = factor.icon;

            return (
              <li
                key={factor.title}
                className={cn(
                  "group relative flex gap-4 border-b p-5 last:border-b-0 sm:p-6 md:min-h-40",
                  index % 2 === 0 && "md:border-r",
                  index >= pricingFactors.length - 2 && "md:border-b-0",
                )}
              >
                <span className="bg-primary/8 text-primary border-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl border">
                  <Icon aria-hidden="true" className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground text-[0.68rem] font-semibold tracking-[0.16em] uppercase tabular-nums"
                  >
                    0{index + 1}
                  </span>
                  <h3 className="mt-1 text-base font-semibold">
                    {factor.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {factor.description}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="bg-primary absolute bottom-0 left-0 h-px w-0 transition-[width] duration-300 group-hover:w-full motion-reduce:transition-none"
                />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function BusinessContextsSection() {
  return (
    <section
      aria-labelledby="contexts-title"
      className="py-16 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="contexts-title"
          eyebrow="O Lucrivo se adapta ao que você faz"
          title="Você vende, produz ou presta serviço?"
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-14">
          {businessContexts.map((context, index) => {
            const Icon = context.icon;

            return (
              <Card
                key={context.title}
                className="hover:border-primary/25 relative min-h-64 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none"
              >
                <CardHeader className="gap-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-primary/8 text-primary border-primary/10 flex size-11 items-center justify-center rounded-xl border">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground text-xs font-semibold tabular-nums"
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <div>
                    <CardTitle>
                      <h3 className="text-xl font-semibold">{context.title}</h3>
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs font-medium">
                      {context.eyebrow}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {context.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-lg leading-relaxed font-medium sm:text-xl">
          O problema é diferente. A pergunta é a mesma:{" "}
          <span className="text-accent-foreground">
            o preço que você cobra faz sentido para o seu negócio?
          </span>
        </p>
      </div>
    </section>
  );
}

function ProductShowcaseSection() {
  const questions = [
    {
      title: "O preço cobre os custos?",
      description: "Veja, em números, se o que você cobra dá conta do que sai.",
    },
    {
      title: "Quanto sobra depois dos custos?",
      description: "Entenda o resultado de cada venda ou atendimento.",
    },
    {
      title: "Faz sentido continuar assim?",
      description:
        "Compare o preço atual com uma referência para a conta fechar.",
    },
  ];

  return (
    <section
      aria-labelledby="showcase-title"
      className="bg-card/65 border-y py-16 sm:py-20 lg:py-28"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16 lg:px-8">
        <div>
          <p className="text-accent-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Uma prévia real do produto
          </p>
          <h2
            id="showcase-title"
            className="mt-3 text-3xl leading-tight font-semibold sm:text-4xl"
          >
            Seus números viram uma resposta clara.
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
            Não importa se você revende, produz ou presta serviço. O resultado
            responde às mesmas perguntas, no contexto do seu negócio.
          </p>
          <ol className="mt-8 space-y-5">
            {questions.map((question, index) => (
              <li key={question.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="border-primary/20 bg-primary/8 text-primary flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{question.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {question.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/register" className={cn(primaryCtaClassName, "mt-8")}>
            Ver no meu negócio
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>

        <DiagnosisShowcase />
      </div>
    </section>
  );
}

function DiagnosisStatusesSection() {
  return (
    <section
      aria-labelledby="statuses-title"
      className="py-16 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="statuses-title"
          eyebrow="Simples de entender"
          title="Você bate o olho e entende."
          description="O resultado combina cor, ícone e uma explicação direta — sem depender de tabela complicada."
        />

        <div className="bg-card mt-10 grid overflow-hidden rounded-2xl border shadow-sm md:grid-cols-3 lg:mt-14">
          {statusItems.map((status, index) => {
            const Icon = status.icon;

            return (
              <article
                key={status.title}
                className={cn(
                  "relative p-6 sm:p-7",
                  index < statusItems.length - 1 &&
                    "border-b md:border-r md:border-b-0",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-1",
                    status.accentClassName,
                  )}
                />
                <Badge
                  variant={status.badgeVariant}
                  className="text-foreground h-7 px-3"
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      status.badgeVariant === "success" && "text-success",
                      status.badgeVariant === "warning" &&
                        "text-warning-foreground dark:text-warning",
                      status.badgeVariant === "destructive" &&
                        "text-destructive",
                    )}
                  />
                  {status.title}
                </Badge>
                <h3 className="mt-5 text-lg font-semibold">{status.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {status.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section aria-labelledby="how-title" className="px-4 py-4 sm:px-6 lg:px-8">
      <div className="bg-foreground text-background mx-auto max-w-7xl overflow-hidden rounded-3xl px-5 py-14 shadow-lg sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-background text-xs font-semibold tracking-[0.18em] uppercase">
              Como funciona
            </p>
            <h2
              id="how-title"
              className="mt-3 text-3xl leading-tight font-semibold sm:text-4xl"
            >
              Três passos. Poucos minutos.
            </h2>
            <p className="text-background/65 mt-4 max-w-md leading-relaxed">
              Você informa. O Lucrivo organiza. A decisão fica mais clara.
            </p>
          </div>

          <ol className="border-background/15 bg-background/15 grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3">
            {howItWorks.map((step, index) => {
              const Icon = step.icon;

              return (
                <li
                  key={step.title}
                  className="bg-foreground flex min-h-60 flex-col p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
                      <Icon aria-hidden="true" className="size-4.5" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-background/40 text-xs font-semibold tabular-nums"
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-auto pt-8 text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="text-background/65 mt-2 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="border-background/15 mt-10 flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-background/65 text-sm">
            Análise gratuita · Resultado personalizado
          </p>
          <Link href="/register" className={primaryCtaClassName}>
            Quero descobrir meu preço
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section
      aria-labelledby="final-cta-title"
      className="py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <span
          aria-hidden="true"
          className="bg-primary mx-auto block h-1 w-16 rounded-full"
        />
        <h2
          id="final-cta-title"
          className="mt-7 text-3xl leading-tight font-semibold sm:text-5xl"
        >
          Antes de mudar seu preço, descubra se a conta fecha.
        </h2>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg">
          Se você cobra um preço, o Lucrivo pode ajudar a entender seus números.
          Leva poucos minutos e é gratuito.
        </p>
        <Link href="/register" className={cn(primaryCtaClassName, "mt-8")}>
          Fazer meu diagnóstico gratuito
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-card/60 border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Brand />
        <p className="text-muted-foreground max-w-lg text-sm leading-relaxed sm:text-right">
          Diagnóstico de preço e rentabilidade para pequenos negócios. ©{" "}
          {new Date().getFullYear()} Lucrivo.
        </p>
      </div>
    </footer>
  );
}

function MobileCta() {
  return (
    <div className="bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_-20px_color-mix(in_oklch,var(--foreground),transparent_75%)] backdrop-blur-xl sm:hidden">
      <Link
        href="/register"
        className={cn(
          buttonVariants(),
          "bg-accent-foreground text-background hover:bg-accent-foreground h-11 w-full [background-image:none]",
        )}
      >
        Começar grátis
        <ArrowRightIcon aria-hidden="true" />
      </Link>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-svh overflow-x-clip pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <a
        href="#conteudo-principal"
        className="bg-background text-foreground focus-visible:ring-ring fixed top-3 left-3 z-[70] -translate-y-24 rounded-lg border px-4 py-2 text-sm font-semibold shadow-md transition-transform focus:translate-y-0 focus-visible:ring-3 focus-visible:outline-none motion-reduce:transition-none"
      >
        Ir para o conteúdo principal
      </a>
      <LandingHeader />
      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="scroll-mt-20 outline-none"
      >
        <HeroSection />
        <PriceAnatomySection />
        <BusinessContextsSection />
        <ProductShowcaseSection />
        <DiagnosisStatusesSection />
        <HowItWorksSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
      <MobileCta />
    </div>
  );
}

export { LandingPage };
