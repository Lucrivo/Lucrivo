import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const {
  getAdminUser,
  getAdminUserDiagnoses,
  getAdminUserHistory,
  getAdminUserSubscriptions,
  notFound,
} = vi.hoisted(() => ({
  getAdminUser: vi.fn(),
  getAdminUserDiagnoses: vi.fn(),
  getAdminUserHistory: vi.fn(),
  getAdminUserSubscriptions: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/modules/admin/users/get-admin-users.service", () => ({
  getAdminUser,
  getAdminUserDiagnoses,
  getAdminUserHistory,
  getAdminUserSubscriptions,
}));
vi.mock("@/modules/admin/users/components/admin-user-detail", () => ({
  AdminUserDetail: ({ tab, back }: { tab: string; back: string }) => (
    <div>
      {tab}: {back}
    </div>
  ),
}));

import AdminUserPage from "./page";

const userId = "96300000-0000-4000-8000-000000000002";

describe("admin user detail page", () => {
  it("rejects an invalid id before any data read", async () => {
    await expect(
      AdminUserPage({
        params: Promise.resolve({ userId: "invalid" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("not-found");
    expect(getAdminUser).not.toHaveBeenCalled();
  });

  it("loads the selected history tab and preserves a safe list context", async () => {
    getAdminUser.mockResolvedValue({ id: userId });
    getAdminUserHistory.mockResolvedValue({ items: [], nextCursor: null });
    render(
      await AdminUserPage({
        params: Promise.resolve({ userId }),
        searchParams: Promise.resolve({
          tab: "history",
          from: "/admin/users?state=blocked",
        }),
      }),
    );
    expect(getAdminUserHistory).toHaveBeenCalledWith(userId, undefined);
    expect(getAdminUserDiagnoses).not.toHaveBeenCalled();
    expect(getAdminUserSubscriptions).not.toHaveBeenCalled();
    expect(
      screen.getByText("history: /admin/users?state=blocked"),
    ).toBeVisible();
  });

  it("refuses an external back URL", async () => {
    getAdminUser.mockResolvedValue({ id: userId });
    render(
      await AdminUserPage({
        params: Promise.resolve({ userId }),
        searchParams: Promise.resolve({
          from: "https://evil.example/admin/users",
        }),
      }),
    );
    expect(screen.getByText("profile: /admin/users")).toBeVisible();
  });
});
