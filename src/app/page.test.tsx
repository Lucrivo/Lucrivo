import { render, screen, within } from "@testing-library/react";
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
    amountCents: 3990,
    currency: "BRL" as const,
    installmentLimit: null,
    accessMonths: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    productCode: "quick_diagnosis_pro" as const,
    billingMode: "semiannual" as const,
    amountCents: 17940,
    currency: "BRL" as const,
    installmentLimit: 6,
    accessMonths: 6,
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
      view.getByRole("link", { name: "Assinar agora por R$ 39,90/mês" }),
    ).toHaveAttribute("href", "/register");
    expect(view.getByRole("link", { name: "Ver planos" })).toHaveAttribute(
      "href",
      "#planos",
    );
    expect(view.getByText("7 dias de garantia.")).toBeInTheDocument();
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

  it("shows the real structure of a diagnosis without presenting it as a screenshot", async () => {
    await renderHome();

    const preview = document.querySelector("#previa");
    expect(preview).not.toBeNull();

    const view = within(preview as HTMLElement);
    expect(
      view.getByRole("heading", {
        level: 2,
        name: "Por dentro do seu diagnóstico.",
      }),
    ).toBeInTheDocument();

    expect(view.queryByRole("tab")).not.toBeInTheDocument();
    expect(view.getByText("Resultado do seu diagnóstico")).toBeInTheDocument();
    expect(
      view.getByRole("heading", { level: 3, name: "Diagnóstico de Produto" }),
    ).toBeInTheDocument();

    for (const question of [
      "Estou ganhando dinheiro?",
      "Meu preço paga todos os gastos?",
      "O que preciso fazer agora?",
    ]) {
      expect(view.getByText(question)).toBeInTheDocument();
    }

    expect(view.getByText("Entenda o resultado")).toBeInTheDocument();
    for (const indicator of [
      "Preço de venda",
      "Menor preço para não ficar no prejuízo",
      "Vendas necessárias no mês",
      "Margem de lucro",
      "Desconto máximo sem prejuízo",
    ]) {
      expect(view.getByText(indicator)).toBeInTheDocument();
    }

    expect(
      view.getByText("Exemplo explicativo com valores fictícios."),
    ).toBeInTheDocument();

    expect(
      view.getByRole("link", { name: "Quero ver isso no meu negócio" }),
    ).toHaveAttribute("href", "/register");
  });

  it("places pricing right after the preview, followed by guarantee and FAQ", async () => {
    await renderHome();

    const sectionIds = Array.from(
      document.querySelectorAll("main > section[id]"),
    ).map((section) => section.id);

    expect(sectionIds).toEqual([
      "top",
      "problema",
      "caminhos",
      "previa",
      "planos",
      "garantia",
      "duvidas",
      "diagnostico",
    ]);
  });

  it("keeps the paused chapters out of the composition", async () => {
    await renderHome();

    expect(document.querySelector("#como-funciona")).toBeNull();
    expect(document.querySelector("#diagnostico-resumo")).toBeNull();
    expect(document.querySelector("#resultado")).toBeNull();
    expect(document.querySelector("#recursos")).toBeNull();
    expect(document.querySelector('a[href="#como-funciona"]')).toBeNull();
  });

  it("presents the 7-day guarantee with its three steps", async () => {
    await renderHome();

    const guarantee = document.querySelector("#garantia");
    expect(guarantee).not.toBeNull();

    const view = within(guarantee as HTMLElement);
    expect(
      view.getByRole("img", { name: "Garantia de 7 dias" }),
    ).toBeInTheDocument();
    expect(
      view.getByRole("heading", { level: 2, name: "Você não arrisca nada." }),
    ).toBeInTheDocument();
    expect(
      view.getByText(
        "Assine e use a Lucrivo com os seus produtos por 7 dias. Se achar que não vale a pena, é só pedir e devolvemos todo o seu dinheiro. Você não precisa explicar o motivo.",
      ),
    ).toBeInTheDocument();

    const steps = [
      ["Assine", "Pague R$ 39,90 com cartão ou Pix. O acesso libera na hora."],
      [
        "Use por 7 dias",
        "Coloque seus produtos e veja o resultado de cada um.",
      ],
    ] as const;

    for (const [title, description] of steps) {
      expect(
        view.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
      expect(view.getByText(description)).toBeInTheDocument();
    }

    const refundStep = view
      .getByRole("heading", { level: 3, name: "Não gostou? Peça de volta" })
      .closest("li");
    expect(refundStep?.querySelector("p")?.textContent).toBe(
      "Mande um email para atendimento@lucrivo.com.br e devolvemos o valor pelo mesmo meio que você pagou.",
    );
    expect(
      within(refundStep as HTMLElement).getByRole("link", {
        name: "atendimento@lucrivo.com.br",
      }),
    ).toHaveAttribute("href", "mailto:atendimento@lucrivo.com.br");
    expect(
      view.getByText("Sem letra miúda. Sem pergunta. Sem complicação."),
    ).toBeInTheDocument();
  });

  it("answers the frequent questions in an accordion with the first four open", async () => {
    await renderHome();

    const faq = document.querySelector("#duvidas");
    expect(faq).not.toBeNull();

    const view = within(faq as HTMLElement);
    expect(
      view.getByRole("heading", { level: 2, name: "Ficou alguma dúvida?" }),
    ).toBeInTheDocument();

    for (const group of [
      "Sobre a assinatura",
      "Sobre pagamento e garantia",
      "Sobre seus dados e suporte",
    ]) {
      expect(
        view.getByRole("heading", { level: 3, name: group }),
      ).toBeInTheDocument();
    }

    const items = Array.from(faq?.querySelectorAll("details") ?? []);
    expect(items).toHaveLength(15);
    expect(items.map((item) => item.open)).toEqual([
      ...Array<boolean>(4).fill(true),
      ...Array<boolean>(11).fill(false),
    ]);

    expect(
      items.map((item) => item.querySelector("summary")?.textContent),
    ).toEqual([
      "Já fiz o diagnóstico grátis. Por que assinar?",
      "R$ 39,90 não é caro?",
      "Funciona para o meu tipo de negócio?",
      "Preciso entender de conta ou de imposto?",
      "E se eu não souber algum número?",
      "Não tenho muito tempo. Vou conseguir usar?",
      "Como funciona a garantia?",
      "Tem fidelidade?",
      "O que acontece depois dos 30 dias?",
      "Posso pagar com Pix?",
      "Quando consigo usar?",
      "Meus dados do diagnóstico grátis continuam lá?",
      "Meus números ficam seguros?",
      "Funciona no celular?",
      "E se eu tiver dúvida usando?",
    ]);

    expect(
      view.getByText(
        "A assinatura renova todo mês por R$ 39,90. Se não quiser continuar, é só cancelar antes da próxima cobrança.",
      ),
    ).toBeInTheDocument();
    expect(view.getByText(/Não achou sua dúvida\?/)).toBeInTheDocument();
    expect(
      view.getByRole("link", { name: "Quero assinar por R$ 39,90/mês" }),
    ).toHaveAttribute("href", "/register");
    expect(view.getByText("Garantia de 7 dias.")).toBeInTheDocument();
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
        /Se você cobra um preço, o Lucrivo pode te ajudar\. Assine, use por\s*7\s*dias e, se não valer a pena, devolvemos tudo\./,
      ),
    ).toBeInTheDocument();
    expect(view.getByText("Risco zero por 7 dias.")).toBeInTheDocument();
    expect(
      view.getByText("Assinatura mensal · Sem fidelidade"),
    ).toBeInTheDocument();

    const proof = view.getByRole("list", { name: "O que está incluso" });
    expect(
      within(proof)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Cartão ou Pix",
      "Acesso liberado na hora",
      "Todos os seus produtos",
    ]);
  });

  it("offers navigation, account, contact and social links in the footer", async () => {
    await renderHome();

    const footer = screen.getByRole("contentinfo");
    const view = within(footer);

    for (const [label, href] of [
      ["Seu negócio", "#caminhos"],
      ["Prévia do diagnóstico", "#previa"],
      ["Planos", "#planos"],
      ["Garantia", "#garantia"],
      ["Dúvidas", "#duvidas"],
      ["Criar conta", "/register"],
      ["Entrar", "/login"],
      ["atendimento@lucrivo.com.br", "mailto:atendimento@lucrivo.com.br"],
    ] as const) {
      expect(view.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }

    const social = view.getByRole("list", { name: "Redes sociais" });
    const socialView = within(social);
    const socialLinks = [
      ["Instagram", "https://www.instagram.com/somoslucrivo/"],
      ["YouTube", "https://www.youtube.com/@somoslucrivo"],
    ] as const;

    expect(
      socialView
        .getAllByRole("link")
        .map((link) => link.getAttribute("aria-label")),
    ).toEqual(socialLinks.map(([label]) => label));

    for (const [label, href] of socialLinks) {
      expect(socialView.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
      expect(socialView.getByRole("link", { name: label })).toHaveAttribute(
        "target",
        "_blank",
      );
      expect(socialView.getByRole("link", { name: label })).toHaveAttribute(
        "rel",
        "noopener noreferrer",
      );
    }

    expect(
      view.getByText(/© \d{4} Lucrivo\. Todos os direitos reservados\./),
    ).toBeInTheDocument();
  });

  it("exposes landing shortcuts including login", async () => {
    await renderHome();

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    const view = within(nav);

    expect(view.getByRole("link", { name: "Seu negócio" })).toHaveAttribute(
      "href",
      "#caminhos",
    );
    expect(view.getByRole("link", { name: "Planos" })).toHaveAttribute(
      "href",
      "#planos",
    );
    expect(view.getByRole("link", { name: "Garantia" })).toHaveAttribute(
      "href",
      "#garantia",
    );
    expect(view.getByRole("link", { name: "Dúvidas" })).toHaveAttribute(
      "href",
      "#duvidas",
    );
    expect(view.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(view.getByRole("link", { name: /Assinar agora/i })).toHaveAttribute(
      "href",
      "/register",
    );
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
      pricingView.getByRole("link", { name: "Escolher semestral" }),
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
        name: "Garantir meu acesso por R$ 39,90/mês",
      }),
    ).toHaveAttribute("href", "/register");
  });

  it("reflects the live monthly price in the offer buttons", async () => {
    listActivePrices.mockResolvedValue({
      status: "success",
      prices: [{ ...prices[0], amountCents: 5990 }, prices[1]],
    });
    await renderHome();

    expect(
      screen.getByRole("link", { name: "Assinar agora por R$ 59,90/mês" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Quero assinar por R$ 59,90/mês" }),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 59,90 não é caro?")).toBeInTheDocument();
  });

  it("keeps free available without inventing prices after a catalog failure", async () => {
    listActivePrices.mockResolvedValue({ status: "read_failed" });
    await renderHome();

    expect(screen.getByRole("heading", { name: "Grátis" })).toBeInTheDocument();
    expect(
      screen.getByText("Planos pagos temporariamente indisponíveis"),
    ).toBeInTheDocument();
    expect(screen.queryByText("R$ 39,90/mês")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Assinar agora por R$ 39,90/mês" }),
    ).toHaveAttribute("href", "/register");
  });
});
