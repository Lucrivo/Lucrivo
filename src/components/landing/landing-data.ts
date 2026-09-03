import {
  BanknoteIcon,
  BoxesIcon,
  Building2Icon,
  CirclePercentIcon,
  Clock3Icon,
  FactoryIcon,
  HandPlatterIcon,
  LandmarkIcon,
  PackageCheckIcon,
  TargetIcon,
} from "lucide-react";

const pricingFactors = [
  {
    title: "Custos",
    description: "Tudo que sai para o produto ou serviço existir.",
    icon: BoxesIcon,
  },
  {
    title: "Impostos",
    description: "A fatia de cada venda destinada às obrigações do negócio.",
    icon: LandmarkIcon,
  },
  {
    title: "Taxas",
    description: "Cartão, aplicativo e marketplace também entram na conta.",
    icon: CirclePercentIcon,
  },
  {
    title: "Tempo",
    description: "Seu trabalho e suas horas têm valor.",
    icon: Clock3Icon,
  },
  {
    title: "Estrutura",
    description: "Aluguel, energia e sistemas mantêm a operação de pé.",
    icon: Building2Icon,
  },
  {
    title: "O quanto você quer ganhar",
    description: "O preço também precisa comportar o lucro desejado.",
    icon: TargetIcon,
  },
] as const;

const businessContexts = [
  {
    title: "Revenda",
    eyebrow: "Você compra pronto e revende",
    description:
      "Descubra se o preço cobrado faz sentido depois de considerar tudo o que sai da sua conta.",
    icon: PackageCheckIcon,
  },
  {
    title: "Produção",
    eyebrow: "Você transforma matéria-prima",
    description:
      "Entenda o custo real da produção e encontre um preço que sustente o seu trabalho.",
    icon: FactoryIcon,
  },
  {
    title: "Serviço",
    eyebrow: "Você vende tempo e conhecimento",
    description:
      "Descubra quanto o serviço precisa gerar para cobrir custos e chegar ao resultado desejado.",
    icon: HandPlatterIcon,
  },
] as const;

type DiagnosisExample = {
  id: "revenda" | "producao" | "servico";
  tabLabel: string;
  item: string;
  costLabel: string;
  costValue: string;
  price: string;
  remainder: string;
  suggestedPrice: string;
  status: "Saudável";
  explanation: string;
};

const diagnosisExamples = [
  {
    id: "revenda",
    tabLabel: "Revenda",
    item: "Produto revendido",
    costLabel: "Produto adquirido",
    costValue: "R$ 20,00",
    price: "R$ 39,90",
    remainder: "28,5%",
    suggestedPrice: "R$ 39,90",
    status: "Saudável",
    explanation:
      "O preço cobre os custos considerados e ainda deixa um resultado positivo.",
  },
  {
    id: "producao",
    tabLabel: "Produção",
    item: "Produto produzido",
    costLabel: "Custo total de produção",
    costValue: "R$ 18,00",
    price: "R$ 42,00",
    remainder: "31,0%",
    suggestedPrice: "R$ 42,00",
    status: "Saudável",
    explanation:
      "O preço cobre o custo de produção considerado e sustenta o trabalho.",
  },
  {
    id: "servico",
    tabLabel: "Serviço",
    item: "Serviço prestado",
    costLabel: "Custo por hora",
    costValue: "R$ 28,00/h",
    price: "R$ 60,00/h",
    remainder: "34,2%",
    suggestedPrice: "R$ 60,00/h",
    status: "Saudável",
    explanation:
      "O valor da hora cobre os custos considerados e alcança o resultado desejado.",
  },
] as const satisfies readonly DiagnosisExample[];

const howItWorks = [
  {
    title: "Informe os dados",
    description:
      "Responda perguntas simples sobre o que você cobra e o que gasta, uma de cada vez.",
    icon: BanknoteIcon,
  },
  {
    title: "O Lucrivo calcula",
    description:
      "Os números são organizados para você, sem planilha e sem termos desnecessários.",
    icon: CirclePercentIcon,
  },
  {
    title: "Receba o diagnóstico",
    description:
      "Veja se o preço cobrado faz sentido para a realidade do seu negócio.",
    icon: TargetIcon,
  },
] as const;

export {
  businessContexts,
  diagnosisExamples,
  howItWorks,
  pricingFactors,
  type DiagnosisExample,
};
