import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardLoading from "./loading";

describe("DashboardLoading", () => {
  it("uses the dashboard-specific loading composition", () => {
    render(<DashboardLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando seus relatórios...",
    );
    expect(screen.getByLabelText("Carregando seus relatórios")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
