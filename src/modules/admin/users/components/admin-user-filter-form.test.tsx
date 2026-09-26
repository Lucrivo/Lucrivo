import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, replace } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { AdminUserFilterForm } from "./admin-user-filter-form";

describe("AdminUserFilterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

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

  it("persists filters and navigates without reloading the document", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        href: "/admin/users?q=cliente%40example.com&state=blocked&access=paid",
      }),
    });
    render(
      <AdminUserFilterForm
        filters={{ q: "", state: "current", access: "all" }}
      />,
    );

    await user.type(screen.getByRole("searchbox"), "cliente@example.com");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Estado da conta" }),
      "blocked",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tipo de acesso" }),
      "paid",
    );
    await user.click(screen.getByRole("button", { name: "Filtrar" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/users/filters",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            q: "cliente@example.com",
            state: "blocked",
            access: "paid",
          }),
        }),
      );
      expect(replace).toHaveBeenCalledWith(
        "/admin/users?q=cliente%40example.com&state=blocked&access=paid",
        { scroll: false },
      );
    });
  });
});
