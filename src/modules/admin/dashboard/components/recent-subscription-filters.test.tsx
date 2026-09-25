import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecentSubscriptionFilters } from "./recent-subscription-filters";

describe("RecentSubscriptionFilters", () => {
  it("renders shareable selected filters and a canonical reset", () => {
    render(
      <RecentSubscriptionFilters
        filters={{ period: "30d", billingMode: "annual", state: "active" }}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Período das assinaturas" }),
    ).toHaveValue("30d");
    expect(screen.getByRole("combobox", { name: "Modalidade" })).toHaveValue(
      "annual",
    );
    expect(screen.getByRole("combobox", { name: "Situação" })).toHaveValue(
      "active",
    );
    expect(screen.getByRole("link", { name: "Limpar" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      screen.getByText("Os filtros abaixo afetam somente esta lista."),
    ).toBeVisible();
  });
});
