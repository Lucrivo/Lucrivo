import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/actions/logout.action", () => ({
  logout: vi.fn(),
}));

vi.mock("@/components/ui/logo", () => ({
  Logo: () => <span>Lucrivo</span>,
}));

import { AdminMfaFrame } from "./admin-mfa-frame";

describe("AdminMfaFrame", () => {
  it("renders the financial-area navigation as a semantic link", () => {
    render(
      <AdminMfaFrame title="Proteja sua conta" subtitle="Configure o MFA.">
        <p>Conteúdo</p>
      </AdminMfaFrame>,
    );

    expect(
      screen.getByRole("link", { name: "Ir para a área financeira" }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
