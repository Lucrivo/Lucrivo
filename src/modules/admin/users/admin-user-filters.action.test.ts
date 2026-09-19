import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore, cookies, redirect, requireAdmin } = vi.hoisted(() => ({
  cookieStore: { set: vi.fn(), delete: vi.fn() },
  cookies: vi.fn(),
  redirect: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/services/require-admin", () => ({ requireAdmin }));

import { ADMIN_USER_FILTER_COOKIE } from "./admin-user-filter-cookie";
import {
  clearAdminUserFilters,
  persistAdminUserFilters,
} from "./admin-user-filters.action";

describe("admin user filter actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({});
    cookies.mockResolvedValue(cookieStore);
  });

  it("stores validated filters in a protected cookie and resets pagination", async () => {
    const formData = new FormData();
    formData.set("q", " cliente@example.com ");
    formData.set("state", "blocked");
    formData.set("access", "courtesy");

    await persistAdminUserFilters(formData);

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(cookieStore.set).toHaveBeenCalledWith(
      ADMIN_USER_FILTER_COOKIE,
      JSON.stringify({
        q: "cliente@example.com",
        state: "blocked",
        access: "courtesy",
      }),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/admin/users",
      }),
    );
    expect(redirect).toHaveBeenCalledWith(
      "/admin/users?q=cliente%40example.com&state=blocked&access=courtesy",
    );
  });

  it("clears the cookie only after confirming admin access", async () => {
    await clearAdminUserFilters();

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(cookieStore.delete).toHaveBeenCalledWith(ADMIN_USER_FILTER_COOKIE);
    expect(redirect).toHaveBeenCalledWith("/admin/users");
  });

  it("does not mutate cookies when authorization fails", async () => {
    requireAdmin.mockRejectedValue(new Error("forbidden"));

    await expect(clearAdminUserFilters()).rejects.toThrow("forbidden");
    expect(cookies).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });
});
