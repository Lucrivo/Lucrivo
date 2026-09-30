import { describe, expect, it } from "vitest";

import {
  reportAiDiagnosisIdSchema,
  reportAiHistoryQuerySchema,
  reportAiMessageSchema,
} from "./report-ai.schema";

describe("report AI HTTP schemas", () => {
  it("normalizes a valid message", () => {
    expect(
      reportAiMessageSchema.parse({
        requestId: "10000000-0000-4000-8000-000000000001",
        reportVersion: 3,
        question: "  Explique a margem.  ",
      }),
    ).toEqual({
      requestId: "10000000-0000-4000-8000-000000000001",
      reportVersion: 3,
      question: "Explique a margem.",
    });
  });

  it("accepts the question length boundary", () => {
    const base = {
      requestId: "10000000-0000-4000-8000-000000000001",
      reportVersion: 0,
    };

    expect(
      reportAiMessageSchema.parse({ ...base, question: "a".repeat(2_000) })
        .question,
    ).toHaveLength(2_000);
    expect(() =>
      reportAiMessageSchema.parse({ ...base, question: "a".repeat(2_001) }),
    ).toThrow();
  });

  it.each([
    { requestId: "not-a-uuid", reportVersion: 3, question: "Pergunta" },
    {
      requestId: "10000000-0000-4000-8000-000000000001",
      reportVersion: -1,
      question: "Pergunta",
    },
    {
      requestId: "10000000-0000-4000-8000-000000000001",
      reportVersion: 1.5,
      question: "Pergunta",
    },
    {
      requestId: "10000000-0000-4000-8000-000000000001",
      reportVersion: 3,
      question: "   ",
    },
  ])("rejects an invalid message %#", (input) => {
    expect(() => reportAiMessageSchema.parse(input)).toThrow();
  });

  it.each(["1", "42", 99])("parses safe positive diagnosis id %s", (id) => {
    expect(reportAiDiagnosisIdSchema.parse(id)).toBe(Number(id));
  });

  it.each(["", "0", "-1", "1.5", "abc", "9007199254740992"])(
    "rejects malformed diagnosis id %s",
    (id) => {
      expect(() => reportAiDiagnosisIdSchema.parse(id)).toThrow();
    },
  );

  it("coerces an optional history version", () => {
    expect(reportAiHistoryQuerySchema.parse({ version: "2" })).toEqual({
      version: 2,
    });
    expect(reportAiHistoryQuerySchema.parse({})).toEqual({});
    expect(() => reportAiHistoryQuerySchema.parse({ version: "-1" })).toThrow();
  });
});
