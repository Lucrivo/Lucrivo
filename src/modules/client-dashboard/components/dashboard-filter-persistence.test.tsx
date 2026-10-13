import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseClientDashboardFilters } from "../client-dashboard.filters";
import { DashboardFilterPersistence } from "./dashboard-filter-persistence";

describe("DashboardFilterPersistence", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("stores explicit filters without persisting the report focus", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ href: "/dashboard?category=product" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardFilterPersistence
        enabled
        filters={parseClientDashboardFilters({
          category: "product",
          report: "42",
        })}
      />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboard/filters",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          from: null,
          to: null,
          categories: ["product"],
          modes: [],
          scenarios: [],
          verdicts: [],
          priorities: [],
          dataState: "all",
        }),
      }),
    );
  });

  it("does not rewrite a filter restored from the cookie", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardFilterPersistence
        enabled={false}
        filters={parseClientDashboardFilters({ category: "product" })}
      />,
    );

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports a persistence failure without blocking the dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    render(
      <DashboardFilterPersistence
        enabled
        filters={parseClientDashboardFilters({ category: "product" })}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Os filtros foram aplicados, mas não foi possível salvá-los. Tente aplicá-los novamente.",
    );
  });
});
