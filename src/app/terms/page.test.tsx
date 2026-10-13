import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TermsPage from "./page";

describe("TermsPage", () => {
  it("shows the supplier, the version, and the privacy link", () => {
    render(<TermsPage />);

    expect(
      screen.getByRole("heading", { name: "Termos de uso" }),
    ).toBeVisible();
    expect(screen.getByText(/Julio Cesar Pereira Bueno/)).toBeVisible();
    expect(screen.getByText("Versão terms-privacy-v1")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Política de privacidade" }),
    ).toHaveAttribute("href", "/privacy");
  });
});
