import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/actions/logout.action", () => ({
  logout: vi.fn(),
}));

import AccountUnavailablePage from "./page";

describe("AccountUnavailablePage", () => {
  it("explains the denial without exposing account details and offers sign-out", () => {
    render(<AccountUnavailablePage />);

    expect(
      screen.getByRole("heading", { name: "Conta indisponível" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Sair da conta" })).toBeVisible();
  });
});
