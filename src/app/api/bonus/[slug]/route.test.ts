import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireClientAccess, getBonusDownload } = vi.hoisted(() => ({
  requireClientAccess: vi.fn(),
  getBonusDownload: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {},
  AccountUnavailableError: class AccountUnavailableError extends Error {},
  LegalAcceptanceRequiredError: class LegalAcceptanceRequiredError extends Error {},
  requireClientAccess,
}));
vi.mock("@/modules/bonus/services/get-bonus-download.service", () => ({
  getBonusDownload,
}));

import {
  AuthRequiredError,
  LegalAcceptanceRequiredError,
} from "@/modules/auth/services/require-user";

import { GET } from "./route";

const supabase = { client: true };

async function get(slug = "ebook") {
  const response = await GET(
    new Request(`https://app.lucrivo.test/api/bonus/${slug}`),
    { params: Promise.resolve({ slug }) },
  );
  const body = await response.text();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  if (body) {
    expect(body).not.toMatch(
      /bonus-materials|ebook\/ebook\.pdf|guide\/guide\.pdf|token=|provider-/,
    );
  }
  return { response, body: body ? JSON.parse(body) : null };
}

describe("GET /api/bonus/:slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireClientAccess.mockResolvedValue({
      userId: "trusted-user",
      supabase,
      isAdmin: false,
    });
    getBonusDownload.mockResolvedValue({
      status: "ready",
      signedUrl: "https://storage.test/object?signature=short-lived",
      delivery: "new_tab",
    });
  });

  it("returns a sanitized authentication failure", async () => {
    requireClientAccess.mockRejectedValue(new AuthRequiredError());
    const { response, body } = await get();
    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "unauthorized" });
    expect(getBonusDownload).not.toHaveBeenCalled();
  });

  it("requires current legal acceptance", async () => {
    requireClientAccess.mockRejectedValue(new LegalAcceptanceRequiredError());
    const { response, body } = await get();
    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "legal_acceptance_required" });
  });

  it("returns a stable not-found response for unknown materials", async () => {
    getBonusDownload.mockResolvedValue({ status: "not_found" });
    const { response, body } = await get("unknown");
    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "material_not_found" });
  });

  it.each([
    ["forbidden", "locked"],
    ["preparing", "preparing"],
    ["unavailable", "unavailable"],
  ] as const)("redirects %s to the safe %s notice", async (status, notice) => {
    getBonusDownload.mockResolvedValue({ status });
    const { response, body } = await get("guide");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `https://app.lucrivo.test/bonus?notice=${notice}`,
    );
    expect(body).toBeNull();
  });

  it("redirects a ready material to the exact server-signed URL", async () => {
    const { response, body } = await get();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://storage.test/object?signature=short-lived",
    );
    expect(body).toBeNull();
    expect(getBonusDownload).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
      slug: "ebook",
    });
  });

  it("sanitizes unexpected authentication and service failures", async () => {
    requireClientAccess.mockRejectedValueOnce(
      new Error("provider-secret and token=private"),
    );
    await expect(get()).resolves.toMatchObject({
      response: { status: 503 },
      body: { error: "service_unavailable" },
    });

    requireClientAccess.mockResolvedValue({
      userId: "trusted-user",
      supabase,
      isAdmin: false,
    });
    getBonusDownload.mockRejectedValueOnce(
      new Error("provider-secret and token=private"),
    );
    await expect(get()).resolves.toMatchObject({
      response: { status: 503 },
      body: { error: "service_unavailable" },
    });
  });
});
