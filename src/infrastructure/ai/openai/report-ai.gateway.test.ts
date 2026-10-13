import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createOpenAiReportAiGateway } from "./report-ai.gateway";

const config = { apiKey: "sk-test-value", model: "gpt-6-luna" };
const input = {
  instructions: "Explique somente o relatório.",
  messages: [
    { role: "user" as const, content: "Contexto do relatório" },
    { role: "assistant" as const, content: "Resumo anterior" },
    { role: "user" as const, content: "Explique a margem." },
  ],
};

function asyncEvents(events: unknown[]): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
    },
  };
}

async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of source) values.push(value);
  return values;
}

describe("OpenAI report AI gateway", () => {
  it("streams normalized deltas and usage without provider storage", async () => {
    const signal = new AbortController().signal;
    const create = vi.fn().mockResolvedValue(
      asyncEvents([
        { type: "response.created" },
        { type: "response.output_text.delta", delta: "Sua " },
        { type: "response.output_text.delta", delta: "margem..." },
        {
          type: "response.completed",
          response: {
            usage: {
              input_tokens: 120,
              input_tokens_details: { cached_tokens: 40 },
              output_tokens: 32,
            },
          },
        },
      ]),
    );
    const gateway = createOpenAiReportAiGateway(config, {
      responses: { create },
    });

    await expect(
      collect(gateway.streamAnswer({ ...input, signal })),
    ).resolves.toEqual([
      { type: "delta", text: "Sua " },
      { type: "delta", text: "margem..." },
      {
        type: "completed",
        usage: { inputTokens: 120, cachedInputTokens: 40, outputTokens: 32 },
      },
    ]);
    expect(create).toHaveBeenCalledWith(
      {
        model: "gpt-6-luna",
        instructions: input.instructions,
        input: input.messages,
        store: false,
        stream: true,
        max_output_tokens: 800,
      },
      { signal },
    );
  });

  it("defaults missing streaming usage counters to zero", async () => {
    const create = vi.fn().mockResolvedValue(
      asyncEvents([
        {
          type: "response.completed",
          response: {},
        },
      ]),
    );
    const gateway = createOpenAiReportAiGateway(config, {
      responses: { create },
    });

    await expect(collect(gateway.streamAnswer(input))).resolves.toEqual([
      {
        type: "completed",
        usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 },
      },
    ]);
  });

  it("summarizes without streaming or provider storage", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: "Resumo acumulado.",
      usage: {
        input_tokens: 80,
        input_tokens_details: { cached_tokens: 20 },
        output_tokens: 12,
      },
    });
    const gateway = createOpenAiReportAiGateway(config, {
      responses: { create },
    });

    await expect(gateway.summarize(input)).resolves.toEqual({
      summary: "Resumo acumulado.",
      usage: { inputTokens: 80, cachedInputTokens: 20, outputTokens: 12 },
    });
    expect(create).toHaveBeenCalledWith({
      model: "gpt-6-luna",
      instructions: input.instructions,
      input: input.messages,
      store: false,
      stream: false,
      max_output_tokens: 500,
    });
  });

  it("rejects an empty summary", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: "   ",
      usage: null,
    });
    const gateway = createOpenAiReportAiGateway(config, {
      responses: { create },
    });

    await expect(gateway.summarize(input)).rejects.toThrow(
      "OpenAI returned an empty report AI summary",
    );
  });
});
