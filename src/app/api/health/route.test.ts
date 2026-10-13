import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the sanitized service identity and deployment revision", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv(
      "VERCEL_GIT_COMMIT_SHA",
      "0123456789abcdef0123456789abcdef01234567",
    );

    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "lucrivo",
      environment: "preview",
      revision: "0123456789ab",
    });
  });

  it("never reflects arbitrary environment values or secrets", async () => {
    vi.stubEnv("VERCEL_ENV", "secret-environment-value");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "secret-revision-value");
    vi.stubEnv("SUPABASE_SECRET_KEY", "supabase-secret");
    vi.stubEnv("ASAAS_API_KEY", "asaas-api-secret");
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "asaas-webhook-secret");

    const response = GET();
    const body = await response.json();

    expect(body).toEqual({
      status: "ok",
      service: "lucrivo",
      environment: "unknown",
      revision: "unknown",
    });
    expect(JSON.stringify(body)).not.toMatch(
      /supabase-secret|asaas-api-secret|asaas-webhook-secret/,
    );
    expect(Object.keys(body)).toEqual([
      "status",
      "service",
      "environment",
      "revision",
    ]);
  });

  it("uses safe local defaults when deployment metadata is absent", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");

    const response = GET();

    await expect(response.json()).resolves.toMatchObject({
      environment: "development",
      revision: "local",
    });
  });
});
