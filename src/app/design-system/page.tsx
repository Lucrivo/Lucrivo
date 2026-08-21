"use client";

import Image from "next/image";
import {
  ArrowUpRightIcon,
  BellIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleDollarSignIcon,
  InfoIcon,
  MoreHorizontalIcon,
  SparklesIcon,
  TriangleAlertIcon,
  TrendingUpIcon,
  XCircleIcon,
} from "lucide-react";

import logo from "@/public/brand/logo.png";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Toaster, toast } from "@/components/ui/toast";

const colors = [
  { name: "Primary", className: "bg-primary", text: "text-primary-foreground" },
  {
    name: "Secondary",
    className: "bg-secondary",
    text: "text-secondary-foreground",
  },
  { name: "Accent", className: "bg-accent", text: "text-accent-foreground" },
  { name: "Muted", className: "bg-muted", text: "text-muted-foreground" },
  { name: "Success", className: "bg-success", text: "text-success-foreground" },
  { name: "Warning", className: "bg-warning", text: "text-warning-foreground" },
  {
    name: "Danger",
    className: "bg-destructive",
    text: "text-destructive-foreground",
  },
  { name: "Info", className: "bg-info", text: "text-info-foreground" },
];

const semanticStates = [
  {
    title: "Meta alcançada",
    description: "Margem 6,4 pp acima do mês anterior.",
    icon: CheckCircle2Icon,
    className: "border-success/25 bg-success/10 text-success",
  },
  {
    title: "Atenção ao estoque",
    description: "Três itens estão abaixo do nível ideal.",
    icon: TriangleAlertIcon,
    className:
      "border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning",
  },
  {
    title: "Falha na sincronização",
    description: "Revise as credenciais da integração.",
    icon: XCircleIcon,
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
  {
    title: "Nova análise disponível",
    description: "Os dados de hoje já foram processados.",
    icon: InfoIcon,
    className: "border-info/25 bg-info/10 text-info",
  },
];

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-fade-in mx-auto max-w-6xl space-y-8">
        <header className="bg-card/85 flex flex-col gap-6 rounded-2xl border p-6 shadow-md backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between lg:p-8">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl border bg-white p-1.5 shadow-sm">
              <Image
                src={logo}
                alt="Símbolo Lucrivo"
                className="size-full object-cover"
                priority
              />
            </div>
            <div>
              <Badge variant="info" className="mb-2">
                <SparklesIcon /> Design System
              </Badge>
              <h1 className="text-3xl sm:text-4xl">Lucrivo</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Base visual para um SaaS financeiro claro, preciso e confiável.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="animate-fade-up space-y-4">
          <SectionHeading
            title="Cores"
            description="Tokens de marca, superfícies e estados semânticos."
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {colors.map((color) => (
              <div
                key={color.name}
                className="bg-card overflow-hidden rounded-xl border shadow-xs"
              >
                <div className={`h-20 ${color.className}`} />
                <div className="p-3">
                  <p className="text-sm font-semibold">{color.name}</p>
                  <p className="text-caption">
                    {color.className.replace("bg-", "--")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <SectionHeading
              title="Tipografia"
              description="Hierarquia compacta, legível e orientada a dados."
            />
            <Card>
              <CardContent className="space-y-5">
                <div>
                  <h1 className="text-4xl">Heading 1</h1>
                  <p className="text-caption">40–48px · Semibold</p>
                </div>
                <div>
                  <h2>Heading 2</h2>
                  <p className="text-caption">24–30px · Semibold</p>
                </div>
                <div>
                  <h3>Heading 3</h3>
                  <p className="text-caption">18px · Semibold</p>
                </div>
                <div>
                  <p className="text-sm leading-relaxed">
                    Body — Informação financeira precisa para decisões mais
                    rentáveis.
                  </p>
                  <p className="text-caption">14px · Regular</p>
                </div>
                <div>
                  <Label>Label de campo</Label>
                  <p className="text-caption">
                    Caption — contexto e ajuda complementar.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <SectionHeading
              title="Ações"
              description="Estados primário, secundário e contextual."
            />
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button>
                  <TrendingUpIcon /> Nova análise
                </Button>
                <Button variant="secondary">Exportar</Button>
                <Button variant="outline">Filtrar</Button>
                <Button variant="ghost">Cancelar</Button>
                <Button variant="destructive">Excluir</Button>
                <Button size="icon" variant="outline" aria-label="Notificações">
                  <BellIcon />
                </Button>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Badge>Ativo</Badge>
                <Badge variant="secondary">Rascunho</Badge>
                <Badge variant="success">Saudável</Badge>
                <Badge variant="warning">Atenção</Badge>
                <Badge variant="destructive">Crítico</Badge>
                <Badge variant="info">Novo</Badge>
              </CardFooter>
            </Card>
          </section>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <SectionHeading
              title="Formulários"
              description="Campos elegantes com foco nítido e feedback acessível."
            />
            <Card>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input id="company" placeholder="Nome da empresa" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail financeiro</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="financeiro@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Adicione contexto para a análise…"
                  />
                </div>
                <div className="bg-muted/40 flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="alerts">Alertas de margem</Label>
                    <p className="text-caption">
                      Receber notificações sobre variações relevantes.
                    </p>
                  </div>
                  <Switch id="alerts" />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <SectionHeading
              title="Card financeiro"
              description="Elevação suave e densidade adequada para dashboards."
            />
            <Card className="hover:border-primary/25 hover:-translate-y-1 hover:shadow-md">
              <CardHeader>
                <CardDescription>Lucro</CardDescription>
                <CardTitle className="flex items-center justify-between text-2xl">
                  <span>32,8%</span>
                  <span className="bg-success/10 text-success rounded-lg p-2">
                    <TrendingUpIcon className="size-5" />
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Progresso da meta
                  </span>
                  <strong>82%</strong>
                </div>
                <Progress value={82}>
                  <ProgressLabel className="sr-only">
                    Progresso da meta
                  </ProgressLabel>
                  <ProgressValue className="sr-only" />
                </Progress>
                <p className="text-success text-sm font-medium">
                  ↑ 6,4 pp{" "}
                  <span className="text-muted-foreground font-normal">
                    vs. mês anterior
                  </span>
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full justify-between">
                  Ver detalhes <ArrowUpRightIcon />
                </Button>
              </CardFooter>
            </Card>
          </section>
        </div>

        <section className="space-y-4">
          <SectionHeading
            title="Estados semânticos"
            description="A cor reforça o significado sem substituir texto ou ícone."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {semanticStates.map(
              ({ title, description, icon: Icon, className }) => (
                <div
                  key={title}
                  className={`flex gap-3 rounded-xl border p-4 ${className}`}
                >
                  <Icon className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-xs opacity-80">{description}</p>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            title="Componentes e movimento"
            description="Entradas rápidas, discretas e baseadas em transform e opacity."
          />
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>
                  <CircleDollarSignIcon /> Abrir dialog
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova meta financeira</DialogTitle>
                    <DialogDescription>
                      Defina um objetivo mensurável para acompanhar no
                      dashboard.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="goal">Meta mensal</Label>
                    <Input id="goal" placeholder="R$ 120.000" />
                  </div>
                  <DialogFooter>
                    <Button>Salvar meta</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  Ações <ChevronDownIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Relatório</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Exportar PDF</DropdownMenuItem>
                    <DropdownMenuItem>Compartilhar</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">
                      Arquivar
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                onClick={() =>
                  toast.add({
                    title: "Relatório atualizado",
                    description:
                      "Os indicadores já refletem os dados mais recentes.",
                    type: "success",
                  })
                }
              >
                Exibir toast
              </Button>
              <Button variant="ghost" size="icon" aria-label="Mais opções">
                <MoreHorizontalIcon />
              </Button>
            </CardContent>
            <CardFooter className="grid gap-3 sm:grid-cols-3">
              <div className="animate-fade-in bg-card rounded-lg border p-3 text-center text-sm">
                Fade in · 250ms
              </div>
              <div className="animate-fade-up bg-card rounded-lg border p-3 text-center text-sm">
                Fade up · 300ms
              </div>
              <div className="animate-scale-in bg-card rounded-lg border p-3 text-center text-sm">
                Scale in · 200ms
              </div>
            </CardFooter>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionHeading
            title="Loading"
            description="Feedback de carregamento sem distrações."
          />
          <Card size="sm" className="max-w-md">
            <CardContent className="flex items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
      <Toaster />
    </main>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </div>
  );
}
