import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FreeDiagnosisBanner } from "./free-diagnosis-banner";

describe("FreeDiagnosisBanner", () => {
  it("invites the user to complete the included diagnosis without campaign urgency", () => {
    render(<FreeDiagnosisBanner />);

    const banner = screen.getByRole("complementary", {
      name: "Primeiro diagnóstico gratuito",
    });
    expect(
      within(banner).getByText("Seu primeiro diagnóstico é grátis"),
    ).toBeVisible();
    expect(
      within(banner).getByText(
        "Comece sem cartão e descubra qual ajuste merece sua atenção primeiro.",
      ),
    ).toBeVisible();
    expect(
      within(banner).getByRole("link", { name: "Fazer diagnóstico grátis" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
    expect(
      within(banner).getByRole("link", { name: "Fazer diagnóstico grátis" }),
    ).toHaveClass("focus-visible:ring-2");
    expect(
      within(banner).queryByRole("region", {
        name: "Tempo restante da oferta de lançamento",
      }),
    ).not.toBeInTheDocument();
  });
});
