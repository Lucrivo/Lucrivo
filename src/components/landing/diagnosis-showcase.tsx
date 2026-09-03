"use client";

import {
  ChartNoAxesCombinedIcon,
  CircleCheckIcon,
  InfoIcon,
} from "lucide-react";

import {
  diagnosisExamples,
  type DiagnosisExample,
} from "@/components/landing/landing-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function DiagnosisExamplePanel({ example }: { example: DiagnosisExample }) {
  return (
    <TabsContent value={example.id} className="m-0">
      <div className="grid gap-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="border-border/70 bg-muted/25 grid min-w-0 gap-1 rounded-xl border p-4 sm:col-span-2">
            <dt className="text-muted-foreground text-xs font-medium">
              Item analisado
            </dt>
            <dd className="truncate text-base font-semibold">{example.item}</dd>
          </div>

          <div className="border-border/70 grid gap-2 rounded-xl border p-4">
            <dt className="text-muted-foreground text-xs font-medium">
              Preço cobrado
            </dt>
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              {example.price}
            </dd>
          </div>

          <div className="border-border/70 grid gap-2 rounded-xl border p-4">
            <dt className="text-muted-foreground text-xs font-medium">
              Custos
            </dt>
            <dd className="grid gap-0.5">
              <span className="text-xl font-semibold tracking-tight tabular-nums">
                {example.costValue}
              </span>
              <span className="text-muted-foreground text-xs leading-5">
                {example.costLabel}
              </span>
            </dd>
          </div>
        </dl>

        <div aria-hidden="true" className="flex items-center gap-3 px-1">
          <span className="bg-border h-px flex-1" />
          <span className="border-primary/25 bg-primary/8 text-primary grid size-7 place-items-center rounded-full border">
            <ChartNoAxesCombinedIcon className="size-3.5" />
          </span>
          <span className="bg-border h-px flex-1" />
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="border-success/25 bg-success/5 grid gap-2 rounded-xl border p-4">
            <dt className="text-muted-foreground text-xs font-medium">
              Quanto sobra
            </dt>
            <dd className="text-success text-2xl font-semibold tracking-tight tabular-nums">
              {example.remainder}
            </dd>
          </div>

          <div className="border-primary/25 bg-primary/5 grid gap-2 rounded-xl border p-4">
            <dt className="text-muted-foreground text-xs font-medium">
              Preço sugerido
            </dt>
            <dd className="text-primary text-2xl font-semibold tracking-tight tabular-nums">
              {example.suggestedPrice}
            </dd>
          </div>

          <div className="border-success/25 bg-success/5 grid gap-2 rounded-xl border p-4 sm:col-span-2">
            <dt className="text-muted-foreground text-xs font-medium">
              Situação
            </dt>
            <dd className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
              <span>
                <Badge variant="success" className="text-foreground">
                  <CircleCheckIcon
                    aria-hidden="true"
                    className="text-success"
                  />
                  {example.status}
                </Badge>
              </span>
              <span className="text-foreground/80 text-sm leading-6 sm:border-l sm:pl-4">
                {example.explanation}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </TabsContent>
  );
}

function DiagnosisShowcase() {
  return (
    <figure className="min-w-0">
      <Card className="border-border/70 gap-0 py-0 shadow-lg">
        <Tabs defaultValue={diagnosisExamples[0].id} className="gap-0">
          <CardHeader className="border-border/70 gap-4 border-b px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
                  <ChartNoAxesCombinedIcon
                    aria-hidden="true"
                    className="size-4.5"
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
                    Prévia do produto
                  </p>
                  <CardTitle>
                    <h3 className="truncate text-base sm:text-lg">
                      Diagnóstico de preço
                    </h3>
                  </CardTitle>
                </div>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex">
                Dados fictícios
              </Badge>
            </div>

            <TabsList
              aria-label="Contexto do exemplo"
              className="grid h-auto w-full grid-cols-3 rounded-xl p-1"
            >
              {diagnosisExamples.map((example) => (
                <TabsTrigger
                  key={example.id}
                  value={example.id}
                  className="min-h-10 min-w-0 px-1 py-2 text-xs sm:px-3 sm:text-sm"
                >
                  {example.tabLabel}
                </TabsTrigger>
              ))}
            </TabsList>
          </CardHeader>

          <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
            {diagnosisExamples.map((example) => (
              <DiagnosisExamplePanel key={example.id} example={example} />
            ))}
          </CardContent>
        </Tabs>
      </Card>

      <figcaption className="text-muted-foreground mt-3 flex items-start gap-2 px-1 text-xs leading-5">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <span className="text-foreground/80 font-medium">
            Exemplo ilustrativo com números fictícios.
          </span>{" "}
          Esta prévia compacta não detalha todos os impostos, taxas e custos de
          estrutura considerados no resultado.
        </span>
      </figcaption>
    </figure>
  );
}

export { DiagnosisShowcase };
