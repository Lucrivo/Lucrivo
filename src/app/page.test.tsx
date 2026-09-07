import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("Home", () => {
  it("introduces the profitability diagnosis", () => {
    render(<Home />);

    const main = screen.getByRole("main");

    expect(main).toHaveTextContent("Lucrivo");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Você sabe se o preço que\s*cobra realmente dá lucro\?/,
      }),
    ).toBeInTheDocument();
  });

  it("explains every part considered when pricing", () => {
    render(<Home />);

    expect(screen.getByRole("main")).toHaveTextContent(
      /custos, impostos, taxas, estrutura, tempo de trabalho e o quanto você quer ganhar/i,
    );
  });

  it("covers all supported business contexts", () => {
    render(<Home />);

    expect(screen.getByRole("main")).toHaveTextContent(
      /Para revenda, produção ou serviço/i,
    );
    expect(
      screen.getByRole("heading", {
        name: "Você vende, produz ou presta serviço?",
      }),
    ).toBeInTheDocument();
  });

  it("shows the financial references produced by the diagnosis", () => {
    render(<Home />);

    const resultLabels = [
      "Margem real",
      "Preço-alvo",
      "Ponto de equilíbrio",
      "Desconto seguro",
      "Orientação prática",
    ];

    for (const label of resultLabels) {
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

  it("routes landing calls to action through the final registration step", () => {
    render(<Home />);

    for (const name of [
      "Diagnóstico grátis",
      "Fazer diagnóstico",
      "Começar gratuitamente",
      "Conhecer o plano",
    ]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "href",
        "#diagnostico",
      );
    }

    const finalStep = document.querySelector("#diagnostico");
    expect(finalStep).not.toBeNull();

    expect(
      within(finalStep as HTMLElement).getByRole("link", {
        name: "Fazer meu diagnóstico gratuito",
      }),
    ).toHaveAttribute("href", "/register");
  });
});
