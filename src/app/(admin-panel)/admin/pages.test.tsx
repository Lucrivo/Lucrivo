import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminDashboardPage from "./page";
import AdminSubscriptionsPage from "./subscriptions/page";
import AdminUsersPage from "./users/page";

describe("minimal admin pages", () => {
  it.each([
    [
      "Dashboard",
      "A visão operacional do sistema será construída aqui.",
      AdminDashboardPage,
    ],
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
