import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PlainLanguageHelp } from "./plain-language-help";

describe("PlainLanguageHelp", () => {
  it("reveals optional detail on click and restores focus after Escape", async () => {
    const user = userEvent.setup();

    render(
      <PlainLanguageHelp
        title="Quanto sobra da venda"
        description="Mostra quanto sobra de cada venda depois de pagar os gastos usados no cálculo."
        technicalTerm="margem"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Entenda este valor",
    });

    expect(
      screen.queryByText("Mostra quanto sobra de cada venda", { exact: false }),
    ).not.toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByText("Quanto sobra da venda")).toBeInTheDocument();
    expect(
      screen.getByText("Nome usado nos cálculos: margem."),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByText("Quanto sobra da venda"),
      ).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("opens a custom trigger from the keyboard with named content", async () => {
    const user = userEvent.setup();

    render(
      <PlainLanguageHelp
        triggerLabel="Como calculamos?"
        title="Preço para alcançar a meta"
        description="Usamos seus gastos, taxas e a meta deste diagnóstico."
      />,
    );

    await user.tab();
    const trigger = screen.getByRole("button", { name: "Como calculamos?" });
    expect(trigger).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("heading", { name: "Preço para alcançar a meta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Usamos seus gastos, taxas e a meta deste diagnóstico."),
    ).toBeInTheDocument();
  });
});
