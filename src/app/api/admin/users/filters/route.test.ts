import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-admin", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/modules/auth/services/require-admin")
    >();
  return { ...actual, requireAdmin };
});

import { ADMIN_USER_FILTER_COOKIE } from "@/modules/admin/users/admin-user-filter-cookie";

import { DELETE, POST } from "./route";

describe("admin user filter route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({});
  });

  it("stores validated filters and returns the client navigation target", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/users/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: " cliente@example.com ",
          state: "blocked",
          access: "courtesy",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      href: "/admin/users?q=cliente%40example.com&state=blocked&access=courtesy",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      `${ADMIN_USER_FILTER_COOKIE}=`,
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Path=/admin/users");
  });

  it("rejects invalid filters without setting a cookie", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/users/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "invalid" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("expires saved filters and returns the canonical list URL", async () => {
    const response = await DELETE();

    await expect(response.json()).resolves.toEqual({ href: "/admin/users" });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      `${ADMIN_USER_FILTER_COOKIE}=;`,
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
