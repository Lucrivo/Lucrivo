import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseClientDashboardFilters } from "../client-dashboard.filters";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));
import { DashboardFilters } from "./dashboard-filters";

describe("DashboardFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ href: "/dashboard" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("announces the current result count next to the filters", () => {
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({})}
        resultCount={12}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "12 relatórios encontrados.",
    );
    expect(
      screen.getAllByRole("heading", { name: "Filtrar relatórios" }),
    ).toHaveLength(2);
  });

  it("applies category and combined-loss filters through the canonical URL", async () => {
    const user = userEvent.setup();
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({})}
        resultCount={0}
      />,
    );

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
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({})}
        resultCount={0}
      />,
    );

    await user.type(screen.getByLabelText("Data final"), "2026-09-30");
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
        resultCount={1}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Até 30\/09\/2026/ }),
    ).toHaveAttribute("href", "/dashboard?dataState=all");
    expect(
      screen.getByRole("button", { name: "Limpar filtros" }),
    ).toBeVisible();
  });

  it("keeps an all-filters selection explicit instead of restoring the cookie", async () => {
    const user = userEvent.setup();
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({ category: "product" })}
        resultCount={1}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Categoria"), "all");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/dashboard?dataState=all", {
        scroll: false,
      }),
    );
  });

  it("deletes the saved preference before clearing active filters", async () => {
    const user = userEvent.setup();
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({ category: "product" })}
        resultCount={1}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith(
      "/api/dashboard/filters",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(replace).toHaveBeenCalledWith("/dashboard", { scroll: false });
  });

  it("maps incomplete data to dataState and keeps its control synchronized", async () => {
    const user = userEvent.setup();
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({})}
        resultCount={0}
      />,
    );

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
        resultCount={1}
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
        resultCount={1}
      />,
    );

    expect(screen.getByLabelText("Categoria")).toHaveClass("h-11");
    expect(
      screen.getByRole("button", { name: "Filtros, 1 ativo" }),
    ).toHaveClass("h-11");
  });

  it("synchronizes the draft when canonical URL filters change", () => {
    const { rerender } = render(
      <DashboardFilters
        filters={parseClientDashboardFilters({})}
        resultCount={0}
      />,
    );

    rerender(
      <DashboardFilters
        filters={parseClientDashboardFilters({ category: "product" })}
        resultCount={1}
      />,
    );

    expect(screen.getByLabelText("Categoria")).toHaveValue("product");
  });

  it("closes the mobile filter sheet after applying filters", async () => {
    const user = userEvent.setup();
    render(
      <DashboardFilters
        filters={parseClientDashboardFilters({})}
        resultCount={0}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    const dialog = screen.getByRole("dialog", { name: "Filtrar relatórios" });
    await user.selectOptions(
      within(dialog).getByLabelText("Categoria"),
      "product",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Aplicar filtros" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
