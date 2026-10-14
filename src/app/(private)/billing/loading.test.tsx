import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BillingLoading from "./loading";

describe("BillingLoading", () => {
  it("reserves the plan comparison structure", () => {
    const { container } = render(<BillingLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando seus planos...",
    );
    expect(
      screen.getByLabelText("Carregando planos e cobrança"),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      container.querySelectorAll('[data-skeleton-kind="billing-plan"]'),
    ).toHaveLength(3);
  });
});
