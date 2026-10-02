import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseClientDashboardFilters } from "../client-dashboard.filters";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { DashboardFilters } from "./dashboard-filters";

describe("DashboardFilters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("applies category and combined-loss filters through the canonical URL", async () => {
    const user = userEvent.setup();
    render(<DashboardFilters filters={parseClientDashboardFilters({})} />);

    await user.selectOptions(screen.getByLabelText("Categoria"), "product");
    await user.selectOptions(screen.getByLabelText("Situação"), "loss");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/dashboard?category=product&verdict=direct_loss%2Coperational_loss",
        { scroll: false },
      ),
    );
  });

  it("converts the inclusive final date to an exclusive URL boundary", async () => {
    const user = userEvent.setup();
    render(<DashboardFilters filters={parseClientDashboardFilters({})} />);

    await user.type(screen.getByLabelText("Até"), "2026-09-30");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/dashboard?to=2026-10-01", {
        scroll: false,
      }),
    );
  });

  it("shows the inclusive date in its removable active chip", () => {
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({
          to: "2026-10-01",
          report: "42",
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Até 30\/09\/2026/ }),
    ).toHaveAttribute("href", "/dashboard");
    expect(
      screen.getByRole("link", { name: "Limpar filtros" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("maps incomplete data to dataState and keeps its control synchronized", async () => {
    const user = userEvent.setup();
    render(<DashboardFilters filters={parseClientDashboardFilters({})} />);

    await user.selectOptions(screen.getByLabelText("Situação"), "pending");
    expect(screen.getByLabelText("Estado dos dados")).toHaveValue("pending");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/dashboard?dataState=pending", {
        scroll: false,
      }),
    );
  });

  it("removes detailed mode and incompatible scenarios for service", async () => {
    const user = userEvent.setup();
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({
          category: "product",
          mode: "detailed",
          scenario: "resale",
        })}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Categoria"), "service");
    expect(screen.getByLabelText("Modalidade")).toHaveValue("all");
    expect(
      within(screen.getByLabelText("Modalidade")).queryByRole("option", {
        name: "Detalhado",
      }),
    ).not.toBeInTheDocument();
  });

  it("exposes 44px primary controls and the active mobile filter count", () => {
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({ category: "product" })}
      />,
    );

    expect(screen.getByLabelText("Categoria")).toHaveClass("h-11");
    expect(
      screen.getByRole("button", { name: "Filtros, 1 ativos" }),
    ).toHaveClass("h-11");
  });
});
