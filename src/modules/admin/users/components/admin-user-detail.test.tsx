import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminUserDetail as User } from "../admin-users.schema";
import { AdminUserDetail } from "./admin-user-detail";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../change-admin-user.action", () => ({ changeAdminUser: vi.fn() }));

const user: User = {
  id: "96300000-0000-4000-8000-000000000002",
  email: "cliente@example.com",
  createdAt: "2026-09-16T12:00:00+00:00",
  lastSignInAt: null,
  state: "blocked",
  blockedAt: "2026-09-16T13:00:00+00:00",
  deletedAt: null,
  access: "free",
  courtesyExpiresAt: null,
  subscription: null,
  diagnosisCount: 2,
  version: 1,
  hasPaidAccess: false,
};

describe("admin user detail", () => {
  it("shows breadcrumb, account facts and URL-addressable tabs", () => {
    render(
      <AdminUserDetail
        user={user}
        tab="profile"
        items={null}
        back="/admin/users?state=blocked"
      />,
    );
    expect(
      screen.getByRole("link", { name: /voltar para usuários/i }),
    ).toHaveAttribute("href", "/admin/users?state=blocked");
    expect(screen.getByRole("tab", { name: "Perfil" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Histórico" })).toHaveAttribute(
      "href",
      expect.stringContaining("tab=history"),
    );
    expect(screen.getByText("Bloqueado")).toBeVisible();
  });

  it("shows bounded administrative history metadata", () => {
    render(
      <AdminUserDetail
        user={user}
        tab="history"
        back="/admin/users"
        items={{
          items: [
            {
              id: "1",
              createdAt: user.createdAt,
              actorEmail: "admin@example.com",
              action: "blocked",
              reason: "Solicitação",
              before: {},
              after: {},
            },
          ],
          nextCursor: null,
        }}
      />,
    );
    expect(screen.getByText("Usuário bloqueado")).toBeVisible();
    expect(screen.getByText(/Motivo: Solicitação/)).toBeVisible();
    expect(screen.getByRole("tab", { name: "Histórico" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
