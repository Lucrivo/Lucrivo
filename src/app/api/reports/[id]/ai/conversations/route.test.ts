import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireUser, getOwnedReport, getReportAiHistory } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOwnedReport: vi.fn(),
  getReportAiHistory: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {},
  requireUser,
}));
vi.mock("@/modules/reports/services/get-report.service", () => ({
  getOwnedReport,
}));
vi.mock("@/modules/report-ai/services/report-ai-store.service", () => ({
  getReportAiHistory,
}));

import { AuthRequiredError } from "@/modules/auth/services/require-user";

import { GET } from "./route";

const supabase = { client: true };
const history = {
  currentVersion: 3,
  selectedVersion: 2,
  versions: [3, 2],
  summary: "Resumo",
  turns: [],
};

async function get(id = "42", query = "?version=2") {
  const response = await GET(
    new Request(
      `https://app.lucrivo.test/api/reports/${id}/ai/conversations${query}`,
    ),
    { params: Promise.resolve({ id }) },
  );
  const body = await response.json();
  expect(response.headers.get("cache-control")).toBe("no-store");
  return { response, body };
}

describe("GET /api/reports/:id/ai/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-123", supabase });
    getOwnedReport.mockResolvedValue({
      status: "found",
      report: { id: 42, version: 3, snapshot: {} },
    });
    getReportAiHistory.mockResolvedValue({ status: "success", history });
  });

  it("authenticates before validating request details", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    const { response, body } = await get("invalid", "?version=bad");

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "unauthorized" });
    expect(getOwnedReport).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid", "?version=2"],
    ["0", "?version=2"],
    ["42", "?version=-1"],
    ["42", "?version=abc"],
    ["42", "?version=2&extra=true"],
  ])("returns 400 for id %s and query %s", async (id, query) => {
    const { response, body } = await get(id, query);

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_request" });
    expect(getOwnedReport).not.toHaveBeenCalled();
  });

  it.each(["not_found", "unavailable"] as const)(
    "maps an owned report result of %s to not_found",
    async (status) => {
      getOwnedReport.mockResolvedValue({ status });

      const { response, body } = await get();

      expect(response.status).toBe(404);
      expect(body).toEqual({ error: "not_found" });
      expect(getReportAiHistory).not.toHaveBeenCalled();
    },
  );

  it("maps report and history read failures to service_unavailable", async () => {
    getOwnedReport.mockResolvedValueOnce({ status: "read_failed" });
    await expect(get()).resolves.toMatchObject({
      response: { status: 503 },
      body: { error: "service_unavailable" },
    });

    getOwnedReport.mockResolvedValue({
      status: "found",
      report: { id: 42, version: 3, snapshot: {} },
    });
    getReportAiHistory.mockResolvedValue({ status: "read_failed" });
    await expect(get()).resolves.toMatchObject({
      response: { status: 503 },
      body: { error: "service_unavailable" },
    });
  });

  it("returns 404 when a requested prior conversation is absent", async () => {
    getReportAiHistory.mockResolvedValue({ status: "not_found" });

    const { response, body } = await get();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "not_found" });
  });

  it("returns prior-version history with no-store", async () => {
    const { response, body } = await get();

    expect(response.status).toBe(200);
    expect(body).toEqual(history);
    expect(getOwnedReport).toHaveBeenCalledWith({
      supabase,
      userId: "user-123",
      diagnosisId: "42",
    });
    expect(getReportAiHistory).toHaveBeenCalledWith({
      supabase,
      userId: "user-123",
      diagnosisId: 42,
      currentVersion: 3,
      selectedVersion: 2,
    });
  });

  it("returns an empty current conversation", async () => {
    const empty = {
      currentVersion: 3,
      selectedVersion: 3,
      versions: [3],
      summary: "",
      turns: [],
    };
    getReportAiHistory.mockResolvedValue({ status: "success", history: empty });

    const { response, body } = await get("42", "");

    expect(response.status).toBe(200);
    expect(body).toEqual(empty);
    expect(getReportAiHistory).toHaveBeenCalledWith(
      expect.objectContaining({ selectedVersion: undefined }),
    );
  });

  it("sanitizes unexpected auth or handler failures", async () => {
    requireUser.mockRejectedValueOnce(new Error("private auth detail"));
    await expect(get()).resolves.toMatchObject({
      response: { status: 503 },
      body: { error: "service_unavailable" },
    });

    requireUser.mockResolvedValue({ userId: "user-123", supabase });
    getOwnedReport.mockRejectedValue(new Error("private database detail"));
    const result = await get();
    expect(result.response.status).toBe(503);
    expect(JSON.stringify(result.body)).not.toContain("private");
  });
});
