import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AcceptTermsScreen } from "./accept-terms-screen";

describe("AcceptTermsScreen", () => {
  it("explains that the acceptance was not recorded", () => {
    render(
      <AcceptTermsScreen
        action={vi.fn()}
        logoutAction={vi.fn()}
        state={{ status: "error" }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível registrar o aceite. Tente novamente.",
    );
  });
});
