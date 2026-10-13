import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readReportAiEnvironment } from "./report-ai-environment";

describe("readReportAiEnvironment", () => {
  it("fails closed when the API key is missing", () => {
    expect(() => readReportAiEnvironment({})).toThrow(
      "Invalid report AI environment configuration",
    );
  });

  it("does not disclose an invalid secret value", () => {
    const leakedSecret = "   ";
    let error: unknown;

    try {
      readReportAiEnvironment({ OPENAI_API_KEY: leakedSecret });
    } catch (cause) {
      error = cause;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(leakedSecret);
  });

  it("uses gpt-6-luna by default", () => {
    expect(
      readReportAiEnvironment({ OPENAI_API_KEY: "sk-test-value" }),
    ).toEqual({ apiKey: "sk-test-value", model: "gpt-6-luna" });
  });

  it("accepts a server-configured model", () => {
    expect(
      readReportAiEnvironment({
        OPENAI_API_KEY: "sk-test-value",
        OPENAI_REPORT_ASSISTANT_MODEL: "gpt-6-luna",
      }),
    ).toEqual({ apiKey: "sk-test-value", model: "gpt-6-luna" });
  });

  it("trims server-only configuration", () => {
    expect(
      readReportAiEnvironment({
        OPENAI_API_KEY: "  sk-test-value  ",
        OPENAI_REPORT_ASSISTANT_MODEL: "  gpt-6-luna  ",
      }),
    ).toEqual({ apiKey: "sk-test-value", model: "gpt-6-luna" });
  });
});

describe(".env.example report AI declarations", () => {
  it("keeps the API key blank and the model server-only", () => {
    const example = readFileSync(
      resolve(process.cwd(), ".env.example"),
      "utf8",
    );

    expect(example).toMatch(/^OPENAI_API_KEY=$/m);
    expect(example).toMatch(/^OPENAI_REPORT_ASSISTANT_MODEL=gpt-6-luna$/m);
    expect(example).not.toMatch(/^NEXT_PUBLIC_OPENAI_/m);
  });
});
