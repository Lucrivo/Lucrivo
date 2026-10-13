import "server-only";

import OpenAI from "openai";

import type { ReportAiEnvironment } from "@/config/report-ai-environment";

type ReportAiUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

type ReportAiGatewayEvent =
  { type: "delta"; text: string } | { type: "completed"; usage: ReportAiUsage };

type ReportAiMessage = {
  role: "user" | "assistant";
  content: string;
};

type GenerateReportAnswerInput = {
  instructions: string;
  messages: ReportAiMessage[];
  signal?: AbortSignal;
};

interface ReportAiGateway {
  streamAnswer(
    input: GenerateReportAnswerInput,
  ): AsyncIterable<ReportAiGatewayEvent>;
  summarize(input: GenerateReportAnswerInput): Promise<{
    summary: string;
    usage: ReportAiUsage;
  }>;
}

type ProviderUsage = {
  input_tokens?: number;
  input_tokens_details?: { cached_tokens?: number } | null;
  output_tokens?: number;
} | null;

type ProviderStreamEvent = {
  type: string;
  delta?: unknown;
  response?: { usage?: ProviderUsage };
};

type ProviderResponse = {
  output_text: string;
  usage?: ProviderUsage;
};

type StreamingRequest = {
  model: string;
  instructions: string;
  input: ReportAiMessage[];
  store: false;
  stream: true;
  max_output_tokens: 800;
};

type SummaryRequest = {
  model: string;
  instructions: string;
  input: ReportAiMessage[];
  store: false;
  stream: false;
  max_output_tokens: 500;
};

type ProviderRequestOptions = { signal?: AbortSignal };

interface OpenAiResponsesClient {
  responses: {
    create(
      input: StreamingRequest,
      options?: ProviderRequestOptions,
    ): Promise<AsyncIterable<ProviderStreamEvent>>;
    create(
      input: SummaryRequest,
      options?: ProviderRequestOptions,
    ): Promise<ProviderResponse>;
  };
}

function normalizeUsage(usage: ProviderUsage | undefined): ReportAiUsage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    cachedInputTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  };
}

function createOpenAiReportAiGateway(
  config: ReportAiEnvironment,
  client?: OpenAiResponsesClient,
): ReportAiGateway {
  const resolvedClient: OpenAiResponsesClient =
    client ?? new OpenAI({ apiKey: config.apiKey });

  return {
    async *streamAnswer(input) {
      const stream = await resolvedClient.responses.create(
        {
          model: config.model,
          instructions: input.instructions,
          input: input.messages,
          store: false,
          stream: true,
          max_output_tokens: 800,
        },
        { signal: input.signal },
      );

      for await (const event of stream) {
        if (
          event.type === "response.output_text.delta" &&
          typeof event.delta === "string"
        ) {
          yield { type: "delta", text: event.delta };
        }

        if (event.type === "response.completed") {
          yield {
            type: "completed",
            usage: normalizeUsage(event.response?.usage),
          };
        }
      }
    },

    async summarize(input) {
      const request = {
        model: config.model,
        instructions: input.instructions,
        input: input.messages,
        store: false,
        stream: false,
        max_output_tokens: 500,
      } satisfies SummaryRequest;
      const response = input.signal
        ? await resolvedClient.responses.create(request, {
            signal: input.signal,
          })
        : await resolvedClient.responses.create(request);
      const summary = response.output_text.trim();

      if (summary.length === 0) {
        throw new Error("OpenAI returned an empty report AI summary");
      }

      return {
        summary,
        usage: normalizeUsage(response.usage),
      };
    },
  };
}

export { createOpenAiReportAiGateway };
export type {
  GenerateReportAnswerInput,
  OpenAiResponsesClient,
  ReportAiGateway,
  ReportAiGatewayEvent,
  ReportAiMessage,
  ReportAiUsage,
};
