import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readBillingEnvironment } from "./billing-environment";

const validEnvironment = {
  APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SECRET_KEY: "supabase-secret",
  ASAAS_API_URL: "https://api-sandbox.asaas.com",
  ASAAS_API_KEY: "asaas-api-key",
  ASAAS_WEBHOOK_TOKEN: "a".repeat(32),
  NODE_ENV: "test",
} satisfies NodeJS.ProcessEnv;

describe("readBillingEnvironment", () => {
  it.each([
    "APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "ASAAS_API_URL",
    "ASAAS_API_KEY",
    "ASAAS_WEBHOOK_TOKEN",
  ] as const)("fails closed when %s is missing", (key) => {
    const environment: NodeJS.ProcessEnv = { ...validEnvironment };
    delete environment[key];

    expect(() => readBillingEnvironment(environment)).toThrow(
      "Invalid billing environment configuration",
    );
  });

  it("does not disclose invalid secret values", () => {
    const leakedSecret = "short-webhook-secret";
    let error: unknown;

    try {
      readBillingEnvironment({
        ...validEnvironment,
        ASAAS_WEBHOOK_TOKEN: leakedSecret,
      });
    } catch (cause) {
      error = cause;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(leakedSecret);
  });

  it("rejects an HTTP application URL in production", () => {
    expect(() =>
      readBillingEnvironment({ ...validEnvironment, NODE_ENV: "production" }),
    ).toThrow("Invalid billing environment configuration");
  });

  it.each([
    "https://api-sandbox.asaas.com",
    "https://api-sandbox.asaas.com/",
    "https://api.asaas.com",
  ])("accepts the supported Asaas API origin %s", (asaasApiUrl) => {
    const result = readBillingEnvironment({
      ...validEnvironment,
      ASAAS_API_URL: asaasApiUrl,
    });

    expect(result.asaasApiUrl.origin).toBe(new URL(asaasApiUrl).origin);
  });

  it.each([
    "http://api-sandbox.asaas.com",
    "https://example.com",
    "https://api-sandbox.asaas.com/v3",
    "https://api.asaas.com?redirect=example.com",
  ])("rejects an unsupported Asaas API URL %s", (asaasApiUrl) => {
    expect(() =>
      readBillingEnvironment({
        ...validEnvironment,
        ASAAS_API_URL: asaasApiUrl,
      }),
    ).toThrow("Invalid billing environment configuration");
  });

  it("returns normalized, typed configuration", () => {
    expect(readBillingEnvironment(validEnvironment)).toEqual({
      appUrl: new URL("http://localhost:3000"),
      supabaseUrl: "https://project.supabase.co",
      supabaseSecretKey: "supabase-secret",
      asaasApiUrl: new URL("https://api-sandbox.asaas.com"),
      asaasApiKey: "asaas-api-key",
      asaasWebhookToken: "a".repeat(32),
    });
  });
});

describe(".env.example billing declarations", () => {
  it("keeps secrets blank and uses the safe Asaas sandbox URL", () => {
    const example = readFileSync(
      resolve(process.cwd(), ".env.example"),
      "utf8",
    );

    expect(example).toMatch(/^SUPABASE_SECRET_KEY=$/m);
    expect(example).toMatch(/^ASAAS_API_KEY=$/m);
    expect(example).toMatch(
      /^ASAAS_API_URL=https:\/\/api-sandbox\.asaas\.com$/m,
    );
    expect(example).toMatch(/^ASAAS_WEBHOOK_TOKEN=$/m);
  });
});
