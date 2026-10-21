import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { changeAdminUser, refresh } = vi.hoisted(() => ({
  changeAdminUser: vi.fn(),
  refresh: vi.fn(),
}));

import type { AdminUser } from "../admin-users.schema";
import { AdminUserActions } from "./admin-user-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("../change-admin-user.action", () => ({ changeAdminUser }));

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
  beforeEach(() => {
    vi.clearAllMocks();
    changeAdminUser.mockResolvedValue({
      status: "updated",
      version: 1,
      courtesyExpiresAt: "2026-10-28T18:30:00+00:00",
    });
  });

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

  it("offers server-authoritative courtesy presets and confirms the returned expiry", async () => {
    const visitor = userEvent.setup();
    render(<AdminUserActions user={user} />);
    await visitor.click(
      screen.getByRole("button", { name: "Ações para cliente@example.com" }),
    );
    await visitor.click(
      await screen.findByRole("menuitem", { name: "Gerenciar cortesia" }),
    );

    expect(screen.getByRole("radio", { name: "1 dia" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "7 dias" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "30 dias" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Personalizar" })).toBeVisible();
    expect(screen.getByText("7 dias a partir da confirmação")).toBeVisible();

    await visitor.type(
      screen.getByRole("textbox", { name: "Motivo" }),
      "Atendimento comercial",
    );
    await visitor.click(
      screen.getByRole("button", { name: "Confirmar alteração" }),
    );

    expect(changeAdminUser).toHaveBeenCalledWith(
      expect.objectContaining({
        courtesyDurationDays: 7,
        courtesyExpiresAt: null,
      }),
    );
    expect(
      await screen.findByRole("status", {
        name: /cortesia até 28 de out\. de 2026, 15:30/i,
      }),
    ).toBeVisible();
  });

  it("shows the exact absolute expiry only in custom mode", async () => {
    const visitor = userEvent.setup();
    render(<AdminUserActions user={user} />);
    await visitor.click(
      screen.getByRole("button", { name: "Ações para cliente@example.com" }),
    );
    await visitor.click(
      await screen.findByRole("menuitem", { name: "Gerenciar cortesia" }),
    );
    await visitor.click(screen.getByRole("radio", { name: "Personalizar" }));

    const expiry = screen.getByLabelText("Validade em São Paulo");
    await visitor.type(expiry, "2026-11-01T12:00");
    expect(
      screen.getByText(/Expira em 1 de nov\. de 2026, 12:00/),
    ).toBeVisible();
  });

  it("offers ending an active courtesy", async () => {
    const visitor = userEvent.setup();
    render(
      <AdminUserActions
        user={{
          ...user,
          access: "courtesy",
          courtesyExpiresAt: "2099-01-01T00:00:00Z",
        }}
      />,
    );
    await visitor.click(
      screen.getByRole("button", { name: "Ações para cliente@example.com" }),
    );
    await visitor.click(
      await screen.findByRole("menuitem", { name: "Gerenciar cortesia" }),
    );
    expect(
      screen.getByRole("button", { name: "Encerrar cortesia" }),
    ).toBeVisible();
  });
});
