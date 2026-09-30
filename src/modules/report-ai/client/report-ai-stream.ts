import { reportAiStreamEventSchema } from "../schemas/report-ai.schema";
import type { ReportAiStreamEvent } from "../report-ai.types";

function parseLine(line: string): ReportAiStreamEvent {
  try {
    const parsed = reportAiStreamEventSchema.safeParse(JSON.parse(line));
    if (parsed.success) return parsed.data;
  } catch {
    // Normalize syntax and semantic failures to one safe client error.
  }
  throw new Error("Invalid report AI event stream");
}

async function* readReportAiEventStream(
  response: Response,
): AsyncGenerator<ReportAiStreamEvent> {
  if (!response.body) throw new Error("Missing report AI event stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line.length > 0) yield parseLine(line);
        newline = buffer.indexOf("\n");
      }

      if (done) break;
    }

    const finalLine = buffer.trim();
    if (finalLine.length > 0) yield parseLine(finalLine);
  } finally {
    reader.releaseLock();
  }
}

export { readReportAiEventStream };
