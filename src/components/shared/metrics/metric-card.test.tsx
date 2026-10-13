import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MetricCard } from "./metric-card";

describe("MetricCard", () => {
  it("exposes explanatory help to keyboard users", async () => {
    const user = userEvent.setup();

    render(
      <MetricCard
        title="Usuários ativos"
        value="45"
        helpText="Pessoas que entraram no Lucrivo nos últimos 30 dias."
      />,
    );

    await user.tab();
    expect(
      screen.getByRole("button", { name: "Entenda Usuários ativos" }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("tooltip", {
        name: /Pessoas que entraram no Lucrivo nos últimos 30 dias/i,
      }),
    ).toBeVisible();
  });

  it("renders a reusable detail region", () => {
    render(
      <MetricCard
        title="Receita mensal"
        value="R$ 2.899,00"
        details={<span>Pagamentos confirmados</span>}
      />,
    );

    expect(screen.getByText("Pagamentos confirmados")).toBeVisible();
  });
});
