import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminUser } from "../admin-users.schema";
import { parseFilters } from "../admin-users.urls";
import { AdminUserList } from "./admin-user-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../change-admin-user.action", () => ({ changeAdminUser: vi.fn() }));

const user: AdminUser = {
  id: "96300000-0000-4000-8000-000000000002",
  email: "cliente@example.com",
  createdAt: "2026-09-16T12:00:00+00:00",
  lastSignInAt: null,
  state: "active",
  access: "free",
  courtesyExpiresAt: null,
  subscription: null,
  diagnosisCount: 2,
  version: 0,
  hasPaidAccess: false,
};

describe("admin user list", () => {
  it("renders a real responsive table, separate menu and pagination", () => {
    render(
      <AdminUserList
        data={{
          items: [user],
          nextCursor: { createdAt: user.createdAt, id: user.id },
        }}
        filters={parseFilters({})}
      />,
    );
    expect(screen.getByRole("table", { name: "Usuários" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Diagnósticos" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Ver usuário cliente@example.com" }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Ações para cliente@example.com" }),
    ).toHaveLength(2);
    const mobileLink = screen.getAllByRole("link", {
      name: "Ver usuário cliente@example.com",
    })[1];
    expect(mobileLink.closest("li")).toHaveClass("min-w-0", "overflow-hidden");
    expect(screen.getByRole("link", { name: "Próxima" })).toHaveAttribute(
      "href",
      expect.stringContaining("cursor="),
    );
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
  });

  it("shows an explicit empty state", () => {
    render(
      <AdminUserList
        data={{ items: [], nextCursor: null }}
        filters={parseFilters({ q: "nada" })}
      />,
    );
    expect(screen.getByText("Nenhum usuário encontrado")).toBeVisible();
    expect(screen.getByRole("searchbox")).toHaveValue("nada");
  });
});
