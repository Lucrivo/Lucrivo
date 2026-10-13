import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AdminDashboardError from "./error";
import AdminDashboardLoading from "./loading";

describe("admin dashboard route states", () => {
  it("reserves the dashboard layout while data loads", () => {
    const { container } = render(<AdminDashboardLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /carregando indicadores do lucrivo/i,
    );
    expect(
      screen.getByLabelText("Carregando painel administrativo"),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      container.querySelectorAll('[data-skeleton-kind="metric"]'),
    ).toHaveLength(6);
    expect(
      container.querySelectorAll('[data-skeleton-kind="chart"]'),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll('[data-skeleton-kind="subscriptions"]'),
    ).toHaveLength(1);
  });

  it("offers a safe retry without exposing provider detail", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<AdminDashboardError reset={reset} />);

    expect(
      screen.getByRole("heading", {
        name: "Não foi possível carregar o painel",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /dados operacionais estão temporariamente indisponíveis/i,
      ),
    ).toBeVisible();
    expect(
      screen.queryByText(/postgres|supabase|rpc/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
