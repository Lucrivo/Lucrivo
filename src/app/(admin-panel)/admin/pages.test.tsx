import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminSubscriptionsPage from "./subscriptions/page";
import AdminUsersPage from "./users/page";

describe("remaining admin scaffold pages", () => {
  it.each([
    ["Usuários", "A gestão de usuários será construída aqui.", AdminUsersPage],
    [
      "Assinaturas",
      "O acompanhamento de assinaturas será construído aqui.",
      AdminSubscriptionsPage,
    ],
  ])("renders only the structural %s destination", (title, message, Page) => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: title })).toBeVisible();
    expect(screen.getByText(message)).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/receita|crescimento|total/i),
    ).not.toBeInTheDocument();
  });
});
