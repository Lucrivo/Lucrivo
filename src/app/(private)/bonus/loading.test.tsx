import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BonusLoading from "./loading";

describe("BonusLoading", () => {
  it("reserves the header and three-material shelf", () => {
    const { container } = render(<BonusLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando seus bônus...",
    );
    expect(screen.getByLabelText("Carregando bônus")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      container.querySelectorAll('[data-skeleton-kind="bonus-material"]'),
    ).toHaveLength(3);
  });
});
