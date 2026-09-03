import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DiagnosisShowcase } from "@/components/landing/diagnosis-showcase";

describe("DiagnosisShowcase", () => {
  it("shows the illustrative resale diagnosis by default", () => {
    render(<DiagnosisShowcase />);

    expect(
      screen.getByRole("tablist", { name: "Contexto do exemplo" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Revenda" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const panel = screen.getByRole("tabpanel");

    expect(within(panel).getByText("Produto revendido")).toBeInTheDocument();
    expect(within(panel).getByText("Produto adquirido")).toBeInTheDocument();
    expect(within(panel).getByText("R$ 20,00")).toBeInTheDocument();
    expect(within(panel).getByText("28,5%")).toBeInTheDocument();
    expect(within(panel).getByText("Saudável")).toBeInTheDocument();

    for (const label of [
      "Item analisado",
      "Preço cobrado",
      "Custos",
      "Quanto sobra",
      "Preço sugerido",
      "Situação",
    ]) {
      expect(within(panel).getByText(label)).toBeInTheDocument();
    }

    expect(
      screen.getByText("Exemplo ilustrativo com números fictícios."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/não detalha todos os impostos, taxas e custos/i),
    ).toBeInTheDocument();
  });

  it("switches examples with pointer interaction", async () => {
    const user = userEvent.setup();

    render(<DiagnosisShowcase />);

    await user.click(screen.getByRole("tab", { name: "Produção" }));

    expect(screen.getByRole("tab", { name: "Produção" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Produto produzido")).toBeInTheDocument();
    expect(screen.getByText("Custo total de produção")).toBeInTheDocument();
    expect(screen.getByText("31,0%")).toBeInTheDocument();
  });

  it("switches examples with the keyboard", async () => {
    const user = userEvent.setup();

    render(<DiagnosisShowcase />);

    const resaleTab = screen.getByRole("tab", { name: "Revenda" });
    resaleTab.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");

    expect(screen.getByRole("tab", { name: "Serviço" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Serviço prestado")).toBeInTheDocument();
    expect(screen.getByText("Custo por hora")).toBeInTheDocument();
    expect(screen.getByText("34,2%")).toBeInTheDocument();
  });
});
