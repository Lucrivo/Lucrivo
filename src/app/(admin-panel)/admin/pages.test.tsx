import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminSubscriptionsPage from "./subscriptions/page";

describe("remaining admin scaffold pages", () => {
  it("renders the subscriptions placeholder", () => {
    render(<AdminSubscriptionsPage />);

    expect(screen.getByRole("heading", { name: "Assinaturas" })).toBeVisible();
    expect(
      screen.getByText("O acompanhamento de assinaturas será construído aqui."),
    ).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/receita|crescimento|total/i),
    ).not.toBeInTheDocument();
  });
});
