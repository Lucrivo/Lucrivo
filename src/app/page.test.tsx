import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, listActivePrices } = vi.hoisted(() => ({
  createClient: vi.fn(),
  listActivePrices: vi.fn(),
}));

vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));
vi.mock("@/modules/billing/services/list-active-prices.service", () => ({
  listActivePrices,
}));

vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

import Home from "@/app/page";

const prices = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    productCode: "quick_diagnosis_pro" as const,
    billingMode: "monthly" as const,
    amountCents: 4990,
    currency: "BRL" as const,
    installmentLimit: null,
    accessMonths: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    productCode: "quick_diagnosis_pro" as const,
    billingMode: "annual" as const,
    amountCents: 47880,
    currency: "BRL" as const,
    installmentLimit: 12,
    accessMonths: 12,
  },
];

describe("Home", () => {
  const supabase = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(supabase);
    listActivePrices.mockResolvedValue({ status: "success", prices });
  });

  async function renderHome() {
    render(await Home());
  }

  it("presents the profitability diagnosis and its next actions", async () => {
    await renderHome();

    const hero = document.querySelector("#top");
    expect(hero).not.toBeNull();

    const view = within(hero as HTMLElement);
    expect(
      view.getByRole("heading", {
        level: 1,
        name: /Você sabe se o preço\s*que\s*cobra\s*realmente\s*dá lucro\?/,
      }),
    ).toBeInTheDocument();
    expect(
      view.getByRole("link", { name: /Fazer diagnóstico gratuito/i }),
    ).toHaveAttribute("href", "/register");
    expect(
      view.getByRole("link", { name: /Conhecer o Lucrivo/i }),
    ).toHaveAttribute("href", "#como-funciona");
    expect(
      view.getByRole("img", {
        name: "Painel ilustrativo do Lucrivo com indicadores financeiros.",
      }),
    ).toBeInTheDocument();
    expect(view.getByText("Sem cartão para começar")).toBeInTheDocument();
    expect(view.getByText("Sem planilhas")).toBeInTheDocument();
    expect(view.getByText("Sem falar contabilês")).toBeInTheDocument();
    expect(listActivePrices).toHaveBeenCalledWith({ supabase });
  });

  it("introduces every factor that shapes a viable price", async () => {
    await renderHome();

    const problem = document.querySelector("#problema");
    expect(problem).not.toBeNull();

    const view = within(problem as HTMLElement);
    expect(
      view.getByRole("heading", {
        level: 2,
        name: "Preço não é só colocar um número.",
      }),
    ).toBeInTheDocument();
    expect(view.getByText("O problema")).toBeInTheDocument();
    expect(
      view.getByText(/Estes são os pontos que costumam mudar tudo/),
    ).toBeInTheDocument();

    const factors = [
      ["Custos", "Tudo que sai para o produto ou serviço existir."],
      ["Impostos", "A fatia que vai embora em cada venda."],
      ["Taxas", "Cartão, app, marketplace — descontam sem avisar."],
      ["Tempo", "Seu trabalho e suas horas também têm valor."],
      ["Estrutura", "Aluguel, luz, sistema: o custo de manter tudo de pé."],
      [
        "O quanto você quer ganhar",
        "O preço tem que caber o seu lucro também.",
      ],
    ] as const;

    for (const [title, description] of factors) {
      expect(
        view.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
      expect(view.getByText(description)).toBeInTheDocument();
    }

    expect(
      Array.from(problem?.querySelectorAll("[data-factor]") ?? []).map((card) =>
        card.getAttribute("data-factor"),
      ),
    ).toEqual(["costs", "taxes", "fees", "time", "structure", "earnings"]);
    expect(problem?.querySelectorAll("[data-problem-card]")).toHaveLength(8);
  });

  it("bridges into the current pricing problem copy", async () => {
    await renderHome();

    const problem = document.querySelector("#problema");
    const view = within(problem as HTMLElement);

    expect(
      view.getByRole("heading", { name: "Preço não é só colocar um número." }),
    ).toBeInTheDocument();
    expect(
      view.getByText("Antes de mudar seu preço, descubra se a conta fecha."),
    ).toBeInTheDocument();

    expect(
      view.getByText(/estes são os pontos que costumam mudar tudo/i),
    ).toBeInTheDocument();
  });

  it("closes the problem section with the approved outcome message", async () => {
    await renderHome();

    const problem = document.querySelector("#problema");
    const view = within(problem as HTMLElement);

    expect(
      view.getByText(
        "Quando você considera todos os pontos, o preço trabalha a seu favor.",
      ),
    ).toBeInTheDocument();
    expect(view.getByText("Preço certo abre caminhos.")).toBeInTheDocument();
    expect(
      view.getByText("E a Lucrivo te ajuda a chegar lá."),
    ).toBeInTheDocument();
  });

  it("presents the three business paths with the same closing question", async () => {
    await renderHome();

    const paths = document.querySelector("#caminhos");
    expect(paths).not.toBeNull();

    const view = within(paths as HTMLElement);
    expect(
      view.getByText("O Lucrivo se adapta ao que você faz"),
    ).toBeInTheDocument();
    expect(
      view.getByRole("heading", {
        level: 2,
        name: "Você vende, produz ou presta serviço?",
      }),
    ).toBeInTheDocument();

    const businessPaths = [
      ["Eu revendo", "Você compra pronto e revende."],
      ["Eu produzo", "Você transforma matéria-prima em produto."],
      ["Eu presto serviço", "Você vende seu tempo, conhecimento ou trabalho."],
    ] as const;

    for (const [title, role] of businessPaths) {
      expect(
        view.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
      expect(view.getByText(role)).toBeInTheDocument();
    }

    expect(
      Array.from(paths?.querySelectorAll("[data-path]") ?? []).map((card) =>
        card.getAttribute("data-path"),
      ),
    ).toEqual(["resale", "production", "service"]);
    expect(
      view.getByText("o preço que você cobra faz sentido para o seu negócio?"),
    ).toBeInTheDocument();
  });

  it("summarizes what the diagnosis shows in five steps", async () => {
    await renderHome();

    const overview = document.querySelector("#diagnostico-resumo");
    expect(overview).not.toBeNull();

    const view = within(overview as HTMLElement);
    expect(
      view.getByRole("heading", {
        level: 2,
        name: "Seus números viram uma resposta clara.",
      }),
    ).toBeInTheDocument();

    for (const title of [
      "Preço",
      "Custos",
      "Quanto sobra",
      "Resultado",
      "Situação",
    ]) {
      expect(
        view.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
    }

    expect(view.getByText(/É uma ferramenta de análise\./)).toBeInTheDocument();
  });

  it("previews the diagnosis for each business type through tabs", async () => {
    await renderHome();

    const preview = document.querySelector("#previa");
    expect(preview).not.toBeNull();

    const view = within(preview as HTMLElement);
    expect(
      view.getByRole("heading", {
        level: 2,
        name: "É assim que o seu diagnóstico chega.",
      }),
    ).toBeInTheDocument();

    const tabs = view.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Revenda",
      "Produção",
      "Serviço",
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(view.getByText("Produto revendido")).toBeInTheDocument();
    expect(view.getByText("Produto adquirido")).toBeInTheDocument();
    expect(view.getAllByText("R$ 39,90")).toHaveLength(2);

    await userEvent.click(tabs[2]);

    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(view.getByText("Serviço prestado")).toBeInTheDocument();
    expect(view.getByText("Custo por hora")).toBeInTheDocument();
    expect(
      view.getByText(
        "O que você cobra pela hora cobre os custos e o resultado fica positivo.",
      ),
    ).toBeInTheDocument();
    expect(
      view.getByText("Exemplo ilustrativo com números fictícios."),
    ).toBeInTheDocument();

    expect(
      view.getByRole("link", { name: "Quero ver isso no meu negócio" }),
    ).toHaveAttribute("href", "/register");
  });

  it("explains the diagnosis verdicts in the product language", async () => {
    await renderHome();

    const colors = document.querySelector("#resultado");
    expect(colors).not.toBeNull();

    const view = within(colors as HTMLElement);
    expect(
      view.getByRole("heading", {
        level: 2,
        name: "O diagnóstico diz o que a conta está fazendo.",
      }),
    ).toBeInTheDocument();

    const verdicts = [
      ["Resultado positivo", "A conta fecha com o que você informou."],
      ["No limite", "Cobre os custos, sem sobra."],
      ["Prejuízo", "A venda ou o mês sai negativo."],
    ] as const;

    for (const [title, description] of verdicts) {
      expect(
        view.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
      expect(view.getByText(description)).toBeInTheDocument();
    }
  });

  it("walks through how it works in three steps", async () => {
    await renderHome();

    const how = document.querySelector("#como-funciona");
    expect(how).not.toBeNull();

    const view = within(how as HTMLElement);
    expect(
      view.getByRole("heading", {
        level: 2,
        name: /Três passos\.\s*Poucos minutos\./,
      }),
    ).toBeInTheDocument();

    for (const title of [
      "Informe os dados",
      "Nós calculamos",
      "Veja seu diagnóstico",
    ]) {
      expect(
        view.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
    }

    expect(
      view.getByRole("link", { name: "Quero descobrir meu preço" }),
    ).toHaveAttribute("href", "/register");
  });

  it("closes with the final call to action copy", async () => {
    await renderHome();

    const finalStep = document.querySelector("#diagnostico");
    expect(finalStep).not.toBeNull();

    const view = within(finalStep as HTMLElement);
    expect(
      view.getByRole("heading", {
        level: 2,
        name: /Antes de mudar seu preço,\s*descubra se a conta fecha\./,
      }),
    ).toBeInTheDocument();
    expect(
      view.getByText(
        "Se você cobra um preço, o Lucrivo pode te ajudar. Leva poucos minutos e é gratuito.",
      ),
    ).toBeInTheDocument();
    expect(
      view.getByText("Análise gratuita • Resultado personalizado"),
    ).toBeInTheDocument();
  });

  it("exposes landing shortcuts including login", async () => {
    await renderHome();

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    const view = within(nav);

    expect(view.getByRole("link", { name: "Como funciona" })).toHaveAttribute(
      "href",
      "#como-funciona",
    );
    expect(view.getByRole("link", { name: "Seu negócio" })).toHaveAttribute(
      "href",
      "#caminhos",
    );
    expect(view.getByRole("link", { name: "Planos" })).toHaveAttribute(
      "href",
      "#planos",
    );
    expect(view.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      view.getByRole("link", { name: /Fazer diagnóstico gratuito/i }),
    ).toHaveAttribute("href", "/register");
  });

  it("keeps the later landing chapters mounted", async () => {
    await renderHome();

    expect(document.querySelector("#planos")).not.toBeNull();
    expect(document.querySelector("#diagnostico")).not.toBeNull();
    expect(document.querySelector("#recursos")).toBeNull();
  });

  it("uses registration for every public plan action", async () => {
    await renderHome();

    const pricing = document.querySelector("#planos");
    expect(pricing).not.toBeNull();
    const pricingView = within(pricing as HTMLElement);

    expect(
      pricingView.getByRole("link", { name: "Começar grátis" }),
    ).toHaveAttribute("href", "/register");
    expect(
      pricingView.getByRole("link", { name: "Escolher anual" }),
    ).toHaveAttribute("href", "/register");
    expect(
      pricingView.getByRole("link", { name: "Escolher mensal" }),
    ).toHaveAttribute("href", "/register");
    expect(pricingView.queryByText("Pagar com Pix")).not.toBeInTheDocument();

    for (const link of pricingView.getAllByRole("link")) {
      expect(link).toHaveAttribute("href", "/register");
    }

    const finalStep = document.querySelector("#diagnostico");
    expect(finalStep).not.toBeNull();
    expect(
      within(finalStep as HTMLElement).getByRole("link", {
        name: "Fazer meu diagnóstico gratuito",
      }),
    ).toHaveAttribute("href", "/register");
  });

  it("keeps free available without inventing prices after a catalog failure", async () => {
    listActivePrices.mockResolvedValue({ status: "read_failed" });
    await renderHome();

    expect(screen.getByRole("heading", { name: "Grátis" })).toBeInTheDocument();
    expect(
      screen.getByText("Planos pagos temporariamente indisponíveis"),
    ).toBeInTheDocument();
    expect(screen.queryByText("R$ 49,90/mês")).not.toBeInTheDocument();
  });
});
