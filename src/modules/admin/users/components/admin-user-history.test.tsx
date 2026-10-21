import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdminUserHistoryEvent } from "../admin-users.schema";
import { AdminUserHistory } from "./admin-user-history";

const event: AdminUserHistoryEvent = {
  eventKey: "admin:1",
  occurredAt: "2026-09-16T12:00:00+00:00",
  kind: "admin_blocked",
  title: "Usuário bloqueado",
  payload: {
    actorEmail: "admin@example.com",
    reason: "fixture with legacy state",
    changes: [],
  },
};

describe("AdminUserHistory", () => {
  it("renders legacy administrative events in the unified timeline", () => {
    render(
      <AdminUserHistory
        page={{ items: [event], nextCursor: null }}
        nextHref="/admin/users/96300000-0000-4000-8000-000000000002?from=%2Fadmin%2Fusers%3Fstate%3Dblocked&tab=history&cursor=next"
      />,
    );

    expect(screen.getByText("Usuário bloqueado")).toBeVisible();
    expect(screen.getByText("fixture with legacy state")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Próxima página" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("from=%2Fadmin%2Fusers%3Fstate%3Dblocked"),
    );
  });
});
