import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage from "./page";

describe("PrivacyPage", () => {
  it("shows the supplier, the version, and the terms link", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { name: "Política de privacidade" }),
    ).toBeVisible();
    expect(screen.getByText(/Julio Cesar Pereira Bueno/)).toBeVisible();
    expect(screen.getByText("Versão terms-privacy-v1")).toBeVisible();
    expect(screen.getByRole("link", { name: "Termos de uso" })).toHaveAttribute(
      "href",
      "/terms",
    );
  });
});
