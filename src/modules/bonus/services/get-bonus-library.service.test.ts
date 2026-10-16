import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { BONUS_MATERIALS } from "../bonus-catalog";
import {
  getBonusLibrary,
  getBonusObjectStatus,
  hasPermanentBonusAccess,
} from "./get-bonus-library.service";

describe("bonus library read model", () => {
  const grantSelect = vi.fn();
  const grantByUser = vi.fn();
  const grantLive = vi.fn();
  const grantLimit = vi.fn();
  const from = vi.fn();
  const list = vi.fn();
  const storageFrom = vi.fn();
  const supabase = { from, storage: { from: storageFrom } };

  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ select: grantSelect });
    grantSelect.mockReturnValue({ eq: grantByUser });
    grantByUser.mockReturnValue({ is: grantLive });
    grantLive.mockReturnValue({ limit: grantLimit });
    grantLimit.mockResolvedValue({ data: [], error: null });
    storageFrom.mockReturnValue({ list });
    list.mockImplementation((folder: string) =>
      Promise.resolve({
        data:
          folder === "ebook"
            ? [{ name: "ebook.pdf" }]
            : folder === "guide"
              ? [{ name: "guide.pdf" }]
              : [{ name: "cash-flow.xlsx" }],
        error: null,
      }),
    );
  });

  function load() {
    return getBonusLibrary({
      supabase: supabase as never,
      userId: "trusted-user",
    });
  }

  it("returns only the free e-book as unlocked without a paid grant", async () => {
    await expect(load()).resolves.toEqual({
      status: "success",
      overview: {
        unlockedCount: 1,
        hasPermanentAccess: false,
        materials: [
          expect.objectContaining({
            slug: "ebook",
            access: "available",
            availability: "ready",
          }),
          expect.objectContaining({
            slug: "guide",
            access: "locked",
            availability: "ready",
          }),
          expect.objectContaining({
            slug: "cash-flow",
            access: "locked",
            availability: "ready",
          }),
        ],
      },
    });

    expect(grantByUser).toHaveBeenCalledWith("user_id", "trusted-user");
    expect(grantLive).toHaveBeenCalledWith("revoked_at", null);
    expect(grantLimit).toHaveBeenCalledWith(1);
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith("ebook", {
      limit: 100,
      search: "ebook.pdf",
    });
  });

  it("unlocks all materials when at least one live grant exists", async () => {
    grantLimit.mockResolvedValue({ data: [{ id: "grant" }], error: null });

    await expect(load()).resolves.toMatchObject({
      status: "success",
      overview: {
        unlockedCount: 3,
        hasPermanentAccess: true,
        materials: [
          { slug: "ebook", access: "available", availability: "ready" },
          { slug: "guide", access: "available", availability: "ready" },
          {
            slug: "cash-flow",
            access: "available",
            availability: "ready",
          },
        ],
      },
    });
    expect(list).toHaveBeenCalledTimes(3);
  });

  it("does not accept courtesy as a bonus entitlement input", async () => {
    await expect(
      getBonusLibrary({
        supabase: supabase as never,
        userId: "courtesy-user",
      }),
    ).resolves.toMatchObject({
      status: "success",
      overview: { unlockedCount: 1, hasPermanentAccess: false },
    });
  });

  it("requires an exact filename match when checking object presence", async () => {
    list.mockResolvedValue({
      data: [{ name: "ebook.pdf.backup" }],
      error: null,
    });

    await expect(
      getBonusObjectStatus({
        supabase: supabase as never,
        material: BONUS_MATERIALS[0],
      }),
    ).resolves.toEqual({ status: "missing" });
  });

  it("maps missing accessible objects to preparation", async () => {
    list.mockResolvedValue({ data: [], error: null });

    const result = await load();
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected bonus library");
    expect(result.overview.materials[0]).toMatchObject({
      slug: "ebook",
      availability: "preparing",
    });
  });

  it("maps Storage failures and thrown errors to unavailable", async () => {
    list.mockResolvedValueOnce({
      data: null,
      error: { message: "private provider detail" },
    });
    const failedResult = await load();
    expect(failedResult.status).toBe("success");
    if (failedResult.status !== "success") {
      throw new Error("expected bonus library");
    }
    expect(failedResult.overview.materials[0]).toMatchObject({
      slug: "ebook",
      availability: "unavailable",
    });

    list.mockRejectedValueOnce(new Error("private provider detail"));
    const thrownResult = await load();
    expect(thrownResult.status).toBe("success");
    if (thrownResult.status !== "success") {
      throw new Error("expected bonus library");
    }
    expect(thrownResult.overview.materials[0]).toMatchObject({
      slug: "ebook",
      availability: "unavailable",
    });
  });

  it("fails closed when the entitlement read fails", async () => {
    grantLimit.mockResolvedValue({
      data: null,
      error: { message: "private database detail" },
    });
    await expect(load()).resolves.toEqual({ status: "read_failed" });

    grantLimit.mockRejectedValueOnce(new Error("private database detail"));
    await expect(
      hasPermanentBonusAccess({
        supabase: supabase as never,
        userId: "trusted-user",
      }),
    ).resolves.toEqual({ status: "read_failed" });
  });
});
