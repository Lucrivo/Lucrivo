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

  it("introduces the profitability diagnosis", async () => {
    await renderHome();

    const main = screen.getByRole("main");
    expect(main).toHaveTextContent("Lucrivo");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Você sabe se o preço que\s*cobra realmente dá lucro\?/,
      }),
    ).toBeInTheDocument();
    expect(listActivePrices).toHaveBeenCalledWith({ supabase });
  });

  it("explains every part considered when pricing", async () => {
    await renderHome();
    expect(screen.getByRole("main")).toHaveTextContent(
      /custos, impostos, taxas, estrutura, tempo de trabalho e o quanto você quer ganhar/i,
    );
  });

  it("covers all supported business contexts", async () => {
    await renderHome();
    expect(screen.getByRole("main")).toHaveTextContent(
      /Para revenda, produção ou serviço/i,
    );
    expect(
      screen.getByRole("heading", {
        name: "Você vende, produz ou presta serviço?",
      }),
    ).toBeInTheDocument();
  });

  it("shows the financial references produced by the diagnosis", async () => {
    await renderHome();
    for (const label of [
      "Margem real",
      "Preço-alvo",
      "Ponto de equilíbrio",
      "Desconto seguro",
      "Orientação prática",
    ]) {
      expect(
        screen.getAllByText(label, { exact: true }).length,
      ).toBeGreaterThan(0);
    }
    expect(
      screen.getByRole("heading", {
        name: "Veja quanto sobra depois de considerar todos os custos.",
      }),
    ).toBeInTheDocument();
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
