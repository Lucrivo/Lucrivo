import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BillingReturnLoading from "./loading";

describe("BillingReturnLoading", () => {
  it("reserves the checkout result card structure", () => {
    const { container } = render(<BillingReturnLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Confirmando a situação do pagamento...",
    );
    expect(screen.getByLabelText("Confirmando pagamento")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      container.querySelectorAll('[data-skeleton-kind="payment-status"]'),
    ).toHaveLength(1);
  });
});
