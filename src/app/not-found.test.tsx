import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NotFound, { metadata } from "./not-found";

vi.mock("@/components/ui/logo", () => ({
  Logo: () => <span data-testid="lucrivo-logo">Lucrivo</span>,
}));

describe("NotFound", () => {
  it("provides a useful browser title", () => {
    expect(metadata).toMatchObject({
      title: "Página não encontrada | Lucrivo",
    });
  });

  it("explains the missing page and offers safe recovery paths", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: "Página não encontrada" }),
    ).toBeVisible();
    expect(screen.getByText("404")).toBeVisible();
    expect(screen.getByTestId("lucrivo-logo")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Voltar para o início" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Entrar na minha conta" }),
    ).toHaveAttribute("href", "/login");
  });
});
