import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    render,
    children,
  }: {
    render: React.ReactElement<Record<string, unknown>>;
    children: React.ReactNode;
  }) => <render.type {...render.props}>{children}</render.type>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    render,
    children,
  }: {
    render: React.ReactElement<Record<string, unknown>>;
    children: React.ReactNode;
  }) => <render.type {...render.props}>{children}</render.type>,
}));

import { AccountMenu } from "./account-menu";

describe("AccountMenu", () => {
  it("usa o avatar como gatilho e apresenta a conta autenticada", () => {
    render(<AccountMenu email="pessoa@lucrivo.local" logoutAction={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Abrir menu da conta" }),
    ).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("pessoa@lucrivo.local")).toBeInTheDocument();
  });

  it("mantém o logout como uma ação de formulário", () => {
    render(<AccountMenu email="pessoa@lucrivo.local" logoutAction={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /sair da conta/i }),
    ).toHaveAttribute("type", "submit");
  });
});
