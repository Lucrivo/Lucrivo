import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AdminUser } from "../admin-users.schema";
import { AdminUserActions } from "./admin-user-actions";

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
  diagnosisCount: 0,
  version: 0,
  hasPaidAccess: false,
};

describe("admin user actions", () => {
  it("opens one accessible menu and asks for confirmation before changing state", async () => {
    const visitor = userEvent.setup();
    render(<AdminUserActions user={user} />);
    await visitor.click(
      screen.getByRole("button", { name: "Ações para cliente@example.com" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: "Ver histórico" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("menuitem", { name: "Editar" }),
    ).not.toBeInTheDocument();
    await visitor.click(screen.getByRole("menuitem", { name: "Bloquear" }));
    expect(
      screen.getByRole("dialog", { name: "Bloquear usuário" }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Motivo" })).toBeVisible();
  });
});
