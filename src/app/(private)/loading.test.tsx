import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivateAreaLoading from "./loading";

describe("PrivateAreaLoading", () => {
  it("reserves the page structure and announces private navigation progress", () => {
    const { container } = render(<PrivateAreaLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando sua área financeira...",
    );
    expect(screen.getByLabelText("Carregando conteúdo")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      container.querySelectorAll('[data-skeleton-kind="summary"]'),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll('[data-skeleton-kind="detail"]'),
    ).toHaveLength(1);
  });
});
