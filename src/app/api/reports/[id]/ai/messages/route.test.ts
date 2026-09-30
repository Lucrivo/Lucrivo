import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  requireUser,
  getOwnedReport,
  getBillingOverview,
  readReportAiEnvironment,
  createOpenAiReportAiGateway,
  buildReportAiContext,
  runReportAiTurn,
} = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOwnedReport: vi.fn(),
  getBillingOverview: vi.fn(),
  readReportAiEnvironment: vi.fn(),
  createOpenAiReportAiGateway: vi.fn(),
  buildReportAiContext: vi.fn(),
  runReportAiTurn: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {},
  requireUser,
}));
vi.mock("@/modules/reports/services/get-report.service", () => ({
  getOwnedReport,
}));
vi.mock("@/modules/billing/services/get-billing-overview.service", () => ({
  getBillingOverview,
}));
vi.mock("@/config/report-ai-environment", () => ({ readReportAiEnvironment }));
vi.mock("@/infrastructure/ai/openai/report-ai.gateway", () => ({
  createOpenAiReportAiGateway,
}));
vi.mock("@/modules/report-ai/domain/build-report-ai-context", () => ({
  buildReportAiContext,
}));
vi.mock("@/modules/report-ai/services/run-report-ai-turn.service", () => ({
  ReportAiPreStreamError: class ReportAiPreStreamError extends Error {
    code: string;
    currentVersion?: number;
    constructor(code: string, currentVersion?: number) {
      super(code);
      this.code = code;
      this.currentVersion = currentVersion;
    }
  },
  runReportAiTurn,
}));

import { AuthRequiredError } from "@/modules/auth/services/require-user";
import { ReportAiPreStreamError } from "@/modules/report-ai/services/run-report-ai-turn.service";

import { POST } from "./route";

const requestId = "10000000-0000-4000-8000-000000000001";
const supabase = { client: true };
const report = { id: 42, version: 3, snapshot: { category: "service" } };

function request(body: unknown, signal?: AbortSignal): Request {
  return new Request("https://app.lucrivo.test/api/reports/42/ai/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal,
  });
}

async function post(
  body: unknown = {
    requestId,
    reportVersion: 3,
    question: "Explique a margem",
  },
  id = "42",
  signal?: AbortSignal,
) {
  const response = await POST(request(body, signal), {
    params: Promise.resolve({ id }),
  });
  const text = await response.text();
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  return { response, text, body: text && isJson ? JSON.parse(text) : null };
}

async function* successEvents() {
  yield { type: "accepted", turnId: 11 } as const;
  yield { type: "delta", text: "Sua margem" } as const;
  yield {
    type: "completed",
    turn: {
      id: 11,
      requestId,
      question: "Explique a margem",
      answer: "Sua margem",
      status: "completed" as const,
      errorCode: null,
      createdAt: "2026-09-30T10:00:00.000Z",
    },
  } as const;
}

describe("POST /api/reports/:id/ai/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-123", supabase });
    getOwnedReport.mockResolvedValue({ status: "found", report });
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: { tier: "paid" },
    });
    readReportAiEnvironment.mockReturnValue({
      apiKey: "sk-private-test",
      model: "gpt-6-luna",
    });
    createOpenAiReportAiGateway.mockReturnValue({ gateway: true });
    buildReportAiContext.mockReturnValue('{"margin":"low"}');
    runReportAiTurn.mockImplementation(successEvents);
  });

  it("authenticates before parsing JSON or creating the secret gateway", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    const result = await post("invalid-json");

    expect(result.response.status).toBe(401);
    expect(result.body).toEqual({ error: "unauthorized" });
    expect(readReportAiEnvironment).not.toHaveBeenCalled();
    expect(createOpenAiReportAiGateway).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid-json", "42"],
    [{ requestId: "bad", reportVersion: 3, question: "Pergunta" }, "42"],
    [{ requestId, reportVersion: 3, question: "" }, "42"],
    [{ requestId, reportVersion: 3, question: "Pergunta" }, "bad"],
  ])("returns invalid_request for malformed input", async (body, id) => {
    const result = await post(body, id);
    expect(result.response.status).toBe(400);
    expect(result.body).toEqual({ error: "invalid_request" });
    expect(getOwnedReport).not.toHaveBeenCalled();
  });

  it.each(["not_found", "unavailable"] as const)(
    "hides a %s report behind not_found",
    async (status) => {
      getOwnedReport.mockResolvedValue({ status });
      const result = await post();
      expect(result.response.status).toBe(404);
      expect(result.body).toEqual({ error: "not_found" });
      expect(getBillingOverview).not.toHaveBeenCalled();
    },
  );

  it.each(["free", "courtesy"])(
    "rejects the %s tier before OpenAI setup",
    async (tier) => {
      getBillingOverview.mockResolvedValue({
        status: "success",
        overview: { tier },
      });

      const result = await post();

      expect(result.response.status).toBe(402);
      expect(result.body).toEqual({ error: "plan_required" });
      expect(readReportAiEnvironment).not.toHaveBeenCalled();
    },
  );

  it("rejects a stale report version before OpenAI setup", async () => {
    const result = await post({
      requestId,
      reportVersion: 2,
      question: "Pergunta preservada",
    });

    expect(result.response.status).toBe(409);
    expect(result.body).toEqual({
      error: "version_conflict",
      currentVersion: 3,
    });
    expect(getBillingOverview).not.toHaveBeenCalled();
    expect(readReportAiEnvironment).not.toHaveBeenCalled();
  });

  it("streams one semantic NDJSON event per line", async () => {
    const result = await post();

    expect(result.response.status).toBe(200);
    expect(result.response.headers.get("content-type")).toBe(
      "application/x-ndjson; charset=utf-8",
    );
    expect(result.response.headers.get("cache-control")).toBe("no-store");
    expect(result.response.headers.get("x-content-type-options")).toBe(
      "nosniff",
    );
    expect(
      result.text
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line)),
    ).toEqual([
      { type: "accepted", turnId: 11 },
      { type: "delta", text: "Sua margem" },
      expect.objectContaining({ type: "completed" }),
    ]);
    expect(runReportAiTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        userId: "user-123",
        diagnosisId: 42,
        reportVersion: 3,
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([
    ["plan_required", 402, "plan_required"],
    ["not_found", 404, "not_found"],
    ["version_conflict", 409, "version_conflict"],
    ["busy", 409, "generation_in_progress"],
    ["rate_limited", 429, "rate_limited"],
    ["monthly_limit", 429, "monthly_limit"],
    ["reservation_failed", 503, "service_unavailable"],
  ] as const)("maps pre-stream %s safely", async (code, status, error) => {
    runReportAiTurn.mockImplementation(async function* () {
      throw new ReportAiPreStreamError(
        code,
        code === "version_conflict" ? 4 : undefined,
      );
    });

    const result = await post();

    expect(result.response.status).toBe(status);
    expect(result.body).toMatchObject({ error });
  });

  it("encodes a safe terminal failure once streaming has started", async () => {
    runReportAiTurn.mockImplementation(async function* () {
      yield { type: "accepted", turnId: 11 };
      yield {
        type: "failed",
        code: "provider_unavailable",
        retry: "new_request",
      };
    });

    const result = await post();

    expect(result.response.status).toBe(200);
    expect(result.text).toContain("provider_unavailable");
    expect(result.text).not.toContain("sk-private-test");
    expect(result.text).not.toContain("provider detail");
  });

  it("passes the request abort signal into orchestration", async () => {
    const controller = new AbortController();
    await post(undefined, "42", controller.signal);
    const passedSignal = runReportAiTurn.mock.calls[0]?.[0]
      ?.signal as AbortSignal;
    controller.abort();

    expect(passedSignal).toBeInstanceOf(AbortSignal);
    expect(passedSignal.aborted).toBe(true);
  });

  it("sanitizes report, billing and environment failures", async () => {
    getOwnedReport.mockResolvedValueOnce({ status: "read_failed" });
    expect((await post()).body).toEqual({ error: "service_unavailable" });

    getOwnedReport.mockResolvedValue({ status: "found", report });
    getBillingOverview.mockResolvedValueOnce({ status: "read_failed" });
    expect((await post()).body).toEqual({ error: "service_unavailable" });

    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: { tier: "paid" },
    });
    readReportAiEnvironment.mockImplementation(() => {
      throw new Error("sk-private-test provider detail");
    });
    const result = await post();
    expect(result.response.status).toBe(503);
    expect(result.body).toEqual({ error: "service_unavailable" });
    expect(result.text).not.toContain("sk-private-test");
  });
});
