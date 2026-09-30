import { describe, expect, it } from "vitest";

import { readReportAiEventStream } from "./report-ai-stream";

const turn = {
  id: 11,
  requestId: "10000000-0000-4000-8000-000000000001",
  question: "Explique a margem",
  answer: "Sua margem",
  status: "completed" as const,
  errorCode: null,
  createdAt: "2026-09-30T10:00:00.000Z",
};

function response(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

async function collect(source: ReturnType<typeof readReportAiEventStream>) {
  const events = [];
  for await (const event of source) events.push(event);
  return events;
}

describe("readReportAiEventStream", () => {
  it("parses split chunks and multiple lines in order", async () => {
    const chunks = [
      '{"type":"delta","text":"Sua ',
      'margem"}\n{"type":"completed","turn":',
      JSON.stringify(turn) + "}\n",
    ];

    await expect(
      collect(readReportAiEventStream(response(chunks))),
    ).resolves.toEqual([
      { type: "delta", text: "Sua margem" },
      { type: "completed", turn },
    ]);
  });

  it("accepts a final unterminated line", async () => {
    await expect(
      collect(
        readReportAiEventStream(
          response(['{"type":"failed","code":"busy","retry":"same_request"}']),
        ),
      ),
    ).resolves.toEqual([
      { type: "failed", code: "busy", retry: "same_request" },
    ]);
  });

  it.each([
    ["invalid JSON", ["not-json\n"]],
    ["invalid semantic event", ['{"type":"delta","text":42}\n']],
  ])("rejects %s", async (_label, chunks) => {
    await expect(
      collect(readReportAiEventStream(response(chunks))),
    ).rejects.toThrow("Invalid report AI event stream");
  });

  it("rejects a response without a body", async () => {
    const empty = new Response(null, { status: 200 });
    await expect(collect(readReportAiEventStream(empty))).rejects.toThrow(
      "Missing report AI event stream",
    );
  });
});
