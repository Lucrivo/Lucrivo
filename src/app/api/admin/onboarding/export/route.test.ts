import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, rpc } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-admin", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/modules/auth/services/require-admin")
    >();
  return { ...actual, requireAdmin };
});

import { AuthRequiredError } from "@/modules/auth/services/require-user";

import { GET } from "./route";

const readyPayload = {
  status: "ready",
  items: [
    {
      fullName: "Ana Ferreira",
      whatsappE164: "+5511999999999",
      segment: "Alimentação",
      subcategory: "Bolos artesanais",
      consentedAt: "2026-10-09T13:00:00+00:00",
    },
  ],
};

function request(query = "") {
  return new Request(
    `http://localhost/api/admin/onboarding/export${query ? `?${query}` : ""}`,
  );
}

describe("admin onboarding export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    requireAdmin.mockResolvedValue({ supabase: { rpc } });
    rpc.mockResolvedValue({ data: readyPayload, error: null });
  });

  it("authorizes, validates filters, and calls the export RPC exactly", async () => {
    const response = await GET(
      request("segmentId=3&subcategoryId=9&from=2026-10-01&to=2026-11-01"),
    );

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("export_admin_onboarding_contacts_v1", {
      p_segment_id: 3,
      p_subcategory_id: 9,
      p_from: "2026-10-01",
      p_to: "2026-11-01",
    });
    expect(response.status).toBe(200);
  });

  it.each([
    "segmentId=0",
    "subcategoryId=abc",
    "from=2026-02-30",
    "from=2026-11-01&to=2026-10-01",
    "consent=declined",
    "q=ana",
  ])("rejects invalid or unsupported query filters: %s", async (query) => {
    const response = await GET(request(query));

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 401 when authentication is missing", async () => {
    requireAdmin.mockRejectedValue(new AuthRequiredError());

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 503 when authorization cannot be checked", async () => {
    requireAdmin.mockRejectedValue(new Error("unavailable"));

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: "empty" }, 204],
    [{ status: "limit_exceeded" }, 422],
  ] as const)("maps the %s export status to %s", async (data, status) => {
    rpc.mockResolvedValue({ data, error: null });

    const response = await GET(request());

    expect(response.status).toBe(status);
    expect(await response.text()).toBe("");
  });

  it("returns a protected UTF-8 CSV download with a dated filename", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T15:00:00.000Z"));

    const response = await GET(request());
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="lucrivo-contatos-autorizados-2026-10-10.csv"',
    );
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes)).toContain("Ana Ferreira");
  });

  it.each([
    { data: readyPayload, error: { message: "rpc failed" } },
    {
      data: { status: "ready", items: [{ fullName: "incomplete" }] },
      error: null,
    },
    { data: { status: "unexpected" }, error: null },
  ])("returns 503 for RPC or strict payload failures", async (result) => {
    rpc.mockResolvedValue(result);

    const response = await GET(request());

    expect(response.status).toBe(503);
  });
});
