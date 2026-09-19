import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { cookies, getAdminUsers } = vi.hoisted(() => ({
  cookies: vi.fn(),
  getAdminUsers: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies }));
vi.mock("@/modules/admin/users/get-admin-users.service", () => ({
  getAdminUsers,
}));
vi.mock("@/modules/admin/users/components/admin-user-list", () => ({
  AdminUserList: ({ data }: { data: { items: unknown[] } }) => (
    <div>Usuários carregados: {data.items.length}</div>
  ),
}));

import AdminUsersPage from "./page";

describe("admin users page", () => {
  it("passes validated URL filters to the guarded read service", async () => {
    cookies.mockResolvedValue({ get: vi.fn(() => undefined) });
    getAdminUsers.mockResolvedValue({ items: [], nextCursor: null });
    render(
      await AdminUsersPage({
        searchParams: Promise.resolve({ state: "blocked", access: "courtesy" }),
      }),
    );
    expect(getAdminUsers).toHaveBeenCalledWith(
      expect.objectContaining({ state: "blocked", access: "courtesy" }),
    );
    expect(screen.getByText("Usuários carregados: 0")).toBeVisible();
  });

  it("restores saved filters when the URL has no explicit filter", async () => {
    cookies.mockResolvedValue({
      get: vi.fn(() => ({
        value: JSON.stringify({ q: "ana", state: "active", access: "paid" }),
      })),
    });
    getAdminUsers.mockResolvedValue({ items: [], nextCursor: null });

    render(await AdminUsersPage({ searchParams: Promise.resolve({}) }));

    expect(getAdminUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "ana", state: "active", access: "paid" }),
    );
  });
});
