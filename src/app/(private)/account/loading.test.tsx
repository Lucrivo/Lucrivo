import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AccountLoading from "./loading";

describe("AccountLoading", () => {
  it("reserves the account profile structure", () => {
    const { container } = render(<AccountLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando os dados da sua conta...",
    );
    expect(screen.getByLabelText("Carregando sua conta")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      container.querySelectorAll('[data-skeleton-kind="account-field"]'),
    ).toHaveLength(5);
  });
});
