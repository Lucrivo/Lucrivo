import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminPagination } from "./admin-pagination";

const itemLabel = { singular: "usuário", plural: "usuários" };

describe("AdminPagination", () => {
  it("shows an exact range and preserves numeric navigation", () => {
    render(
      <AdminPagination
        page={3}
        pageSize={20}
        totalCount={96}
        totalPages={5}
        itemLabel={itemLabel}
        buildHref={(page) => `/admin/users?page=${page}`}
      />,
    );

    expect(
      screen.getByText("41–60 de 96 usuários · Página 3 de 5"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Página anterior" }),
    ).toHaveAttribute("href", "/admin/users?page=2");
    expect(
      screen.getByRole("link", { name: "Próxima página" }),
    ).toHaveAttribute("href", "/admin/users?page=4");
    expect(screen.getByRole("link", { name: "Página 3" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("bounds first and last pages and inserts ellipses across gaps", () => {
    const { rerender } = render(
      <AdminPagination
        page={1}
        pageSize={20}
        totalCount={200}
        totalPages={10}
        itemLabel={itemLabel}
        buildHref={(page) => `/admin/users?page=${page}`}
      />,
    );
    expect(screen.queryByRole("link", { name: "Página anterior" })).toBeNull();
    expect(screen.getByRole("link", { name: "Página 10" })).toBeVisible();
    expect(screen.getByText("Mais páginas")).toHaveClass("sr-only");

    rerender(
      <AdminPagination
        page={10}
        pageSize={20}
        totalCount={200}
        totalPages={10}
        itemLabel={itemLabel}
        buildHref={(page) => `/admin/users?page=${page}`}
      />,
    );
    expect(screen.queryByRole("link", { name: "Próxima página" })).toBeNull();
    expect(screen.getByRole("link", { name: "Página 10" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("uses the zero-result copy and exposes no pagination links", () => {
    render(
      <AdminPagination
        page={1}
        pageSize={20}
        totalCount={0}
        totalPages={0}
        itemLabel={itemLabel}
        buildHref={(page) => `/admin/users?page=${page}`}
      />,
    );
    expect(screen.getByText("0 usuários · Página 0 de 0")).toBeVisible();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
