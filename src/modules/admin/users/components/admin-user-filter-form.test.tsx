import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../admin-user-filters.action", () => ({
  clearAdminUserFilters: vi.fn(),
  persistAdminUserFilters: vi.fn(),
}));

import { AdminUserFilterForm } from "./admin-user-filter-form";

describe("AdminUserFilterForm", () => {
  it("renders restored values and the saved-filter clear action", () => {
    render(
      <AdminUserFilterForm
        filters={{ q: "cliente@", state: "blocked", access: "paid" }}
      />,
    );

    expect(screen.getByRole("searchbox")).toHaveValue("cliente@");
    expect(
      screen.getByRole("combobox", { name: "Estado da conta" }),
    ).toHaveValue("blocked");
    expect(
      screen.getByRole("combobox", { name: "Tipo de acesso" }),
    ).toHaveValue("paid");
    expect(
      screen.getByRole("button", { name: "Limpar filtros salvos" }),
    ).toBeVisible();
  });
});
