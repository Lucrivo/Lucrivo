import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { BonusLibrary, getBonusLibrary, requireUser } = vi.hoisted(() => ({
  BonusLibrary: vi.fn(
    ({
      unlockedCount,
      notice,
    }: {
      unlockedCount: number;
      notice: string | null;
    }) => (
      <div>
        {unlockedCount} materiais
        {notice ? <span role="alert">{notice}</span> : null}
      </div>
    ),
  ),
  getBonusLibrary: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/bonus/services/get-bonus-library.service", () => ({
  getBonusLibrary,
}));
vi.mock("@/modules/bonus/components/bonus-library", () => ({ BonusLibrary }));

import BonusPage from "./page";

const freeOverview = {
  unlockedCount: 1 as const,
  hasPermanentAccess: false,
  materials: [],
};

describe("BonusPage", () => {
  const supabase = { from: vi.fn(), storage: { from: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    getBonusLibrary.mockResolvedValue({
      status: "success",
      overview: freeOverview,
    });
  });

  async function renderPage(searchParams: { notice?: string | string[] } = {}) {
    render(await BonusPage({ searchParams: Promise.resolve(searchParams) }));
  }

  it("loads and renders the authenticated free library", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { name: "Bônus", level: 1 }),
    ).toBeVisible();
    expect(screen.getByText("1 materiais")).toBeVisible();
    expect(getBonusLibrary).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
    });
    expect(BonusLibrary).toHaveBeenCalledWith(
      { ...freeOverview, notice: null },
      undefined,
    );
  });

  it("renders the entitled view unchanged", async () => {
    getBonusLibrary.mockResolvedValue({
      status: "success",
      overview: {
        unlockedCount: 3,
        hasPermanentAccess: true,
        materials: [],
      },
    });

    await renderPage();
    expect(screen.getByText("3 materiais")).toBeVisible();
  });

  it.each(["locked", "preparing", "unavailable"])(
    "passes the stable %s route notice",
    async (notice) => {
      await renderPage({ notice });
      expect(screen.getByRole("alert")).toHaveTextContent(notice);
    },
  );

  it.each([
    { notice: "unknown" },
    { notice: ["locked", "preparing"] },
    { notice: ["locked"] },
    { notice: "locked%00" },
  ])("normalizes malformed notices to null", async (searchParams) => {
    await renderPage(searchParams);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(BonusLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ notice: null }),
      undefined,
    );
  });

  it("throws a stable route failure when grants cannot be read", async () => {
    getBonusLibrary.mockResolvedValue({ status: "read_failed" });

    await expect(
      BonusPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("bonus_library_unavailable");
  });
});
