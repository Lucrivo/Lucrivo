import { beforeEach, describe, expect, it, vi } from "vitest";

const { hasPermanentBonusAccess, getBonusObjectStatus } = vi.hoisted(() => ({
  hasPermanentBonusAccess: vi.fn(),
  getBonusObjectStatus: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./get-bonus-library.service", () => ({
  hasPermanentBonusAccess,
  getBonusObjectStatus,
}));

import { getBonusDownload } from "./get-bonus-download.service";

describe("getBonusDownload", () => {
  const createSignedUrl = vi.fn();
  const storageFrom = vi.fn();
  const supabase = { storage: { from: storageFrom } };

  beforeEach(() => {
    vi.clearAllMocks();
    hasPermanentBonusAccess.mockResolvedValue({
      status: "success",
      hasPermanentAccess: false,
    });
    getBonusObjectStatus.mockResolvedValue({ status: "ready" });
    storageFrom.mockReturnValue({ createSignedUrl });
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.test/signed?token=private" },
      error: null,
    });
  });

  function download(slug: string) {
    return getBonusDownload({
      supabase: supabase as never,
      userId: "trusted-user",
      slug,
    });
  }

  it("rejects unknown slugs before entitlement or Storage access", async () => {
    await expect(download("../../secret")).resolves.toEqual({
      status: "not_found",
    });
    expect(hasPermanentBonusAccess).not.toHaveBeenCalled();
    expect(getBonusObjectStatus).not.toHaveBeenCalled();
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it("signs the free e-book for a short-lived new-tab delivery", async () => {
    await expect(download("ebook")).resolves.toEqual({
      status: "ready",
      signedUrl: "https://storage.test/signed?token=private",
      delivery: "new_tab",
    });
    expect(hasPermanentBonusAccess).not.toHaveBeenCalled();
    expect(createSignedUrl).toHaveBeenCalledWith("ebook/ebook.pdf", 60);
  });

  it("forbids protected materials without a live permanent grant", async () => {
    await expect(download("guide")).resolves.toEqual({
      status: "forbidden",
    });
    expect(hasPermanentBonusAccess).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
    });
    expect(getBonusObjectStatus).not.toHaveBeenCalled();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("does not misrepresent an entitlement read failure as forbidden", async () => {
    hasPermanentBonusAccess.mockResolvedValue({ status: "read_failed" });
    await expect(download("guide")).resolves.toEqual({
      status: "unavailable",
    });
  });

  it.each([
    ["missing", "preparing"],
    ["unavailable", "unavailable"],
  ] as const)("maps an object status of %s to %s", async (object, result) => {
    getBonusObjectStatus.mockResolvedValue({ status: object });
    await expect(download("ebook")).resolves.toEqual({ status: result });
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns unavailable when signing fails or throws", async () => {
    createSignedUrl.mockResolvedValueOnce({
      data: null,
      error: { message: "private storage detail" },
    });
    await expect(download("ebook")).resolves.toEqual({
      status: "unavailable",
    });

    createSignedUrl.mockRejectedValueOnce(new Error("private storage detail"));
    await expect(download("ebook")).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("uses a fixed download name for the entitled spreadsheet", async () => {
    hasPermanentBonusAccess.mockResolvedValue({
      status: "success",
      hasPermanentAccess: true,
    });

    await expect(download("cash-flow")).resolves.toMatchObject({
      status: "ready",
      delivery: "download",
    });
    expect(createSignedUrl).toHaveBeenCalledWith(
      "spreadsheet/cash-flow.xlsx",
      60,
      { download: "planilha-controle-fluxo-de-caixa.xlsx" },
    );
  });
});
