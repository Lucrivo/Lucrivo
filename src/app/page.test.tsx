import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("introduces the profitability diagnosis", () => {
    render(<Home />);

    const main = screen.getByRole("main");

    expect(main).toHaveTextContent("Lucrivo");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Você sabe se o preço que cobra realmente dá lucro?",
      }),
    ).toBeInTheDocument();
  });

  it("explains every part considered when pricing", () => {
    render(<Home />);

    const pricingFactors = [
      "Custos",
      "Impostos",
      "Taxas",
      "Tempo",
      "Estrutura",
      "O quanto você quer ganhar",
    ];

    for (const factor of pricingFactors) {
      expect(
        screen.getAllByText(factor, { exact: true }).length,
      ).toBeGreaterThan(0);
    }
  });

  it("covers all supported business contexts", () => {
    render(<Home />);

    for (const context of ["Revenda", "Produção", "Serviço"]) {
      expect(
        screen.getAllByText(context, { exact: true }).length,
      ).toBeGreaterThan(0);
    }
  });

  it("shows the diagnosis result vocabulary and illustrative-data notice", () => {
    render(<Home />);

    const resultLabels = [
      "Item analisado",
      "Preço cobrado",
      "Custos",
      "Quanto sobra",
      "Preço sugerido",
      "Situação",
    ];

    for (const label of resultLabels) {
      expect(
        screen.getAllByText(label, { exact: true }).length,
      ).toBeGreaterThan(0);
    }

    for (const status of ["Saudável", "Atenção", "Risco"]) {
      expect(
        screen.getAllByText(status, { exact: true }).length,
      ).toBeGreaterThan(0);
    }

    expect(
      screen.getAllByText("Exemplo ilustrativo com números fictícios.", {
        exact: true,
      }).length,
    ).toBeGreaterThan(0);
  });

  it("routes calls to action through the existing authentication flow", () => {
    render(<Home />);

    const registrationLinks = screen.getAllByRole("link", {
      name: /diagnóstico gratuito|começar grátis|ver no meu negócio|quero descobrir meu preço/i,
    });

    for (const link of registrationLinks) {
      expect(link).toHaveAttribute("href", "/register");
    }

    const signInLinks = screen.getAllByRole("link", { name: "Entrar" });

    for (const link of signInLinks) {
      expect(link).toHaveAttribute("href", "/login");
    }
  });
});
