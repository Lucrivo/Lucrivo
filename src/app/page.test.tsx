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

    const problem = document.querySelector("#como-funciona");
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
  });

  it("uses the business contexts as a bridge into the pricing problem", async () => {
    await renderHome();

    const problem = document.querySelector("#como-funciona");
    const view = within(problem as HTMLElement);

    expect(
      view.getByText("Feito para a realidade de quem empreende"),
    ).toBeInTheDocument();
    expect(
      view.getByText("Antes de mudar seu preço, descubra se a conta fecha."),
    ).toBeInTheDocument();

    for (const context of [
      "Revenda",
      "Produção própria",
      "Prestação de serviço",
    ]) {
      expect(view.getByText(context)).toBeInTheDocument();
    }
  });

  it("closes the problem section with the approved outcome message", async () => {
    await renderHome();

    const problem = document.querySelector("#como-funciona");
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

  it("keeps the later business-context chapter", async () => {
    await renderHome();
    expect(
      screen.getByRole("heading", {
        name: "Você vende, produz ou presta serviço?",
      }),
    ).toBeInTheDocument();
  });

  it("keeps the later landing chapters mounted", async () => {
    await renderHome();

    expect(document.querySelector("#recursos")).not.toBeNull();
    expect(document.querySelector("#planos")).not.toBeNull();
    expect(document.querySelector("#diagnostico")).not.toBeNull();
  });

  it("uses registration for every public plan action", async () => {
    await renderHome();

    const pricing = document.querySelector("#planos");
    expect(pricing).not.toBeNull();
    for (const link of within(pricing as HTMLElement).getAllByRole("link")) {
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
