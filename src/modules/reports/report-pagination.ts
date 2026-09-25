import { z } from "zod";

import { decodeReportsCursor } from "./services/list-reports.service";

const MAX_CURSOR_LENGTH = 500;
const MAX_HISTORY_ENTRIES = 100;
const MAX_ENCODED_HISTORY_LENGTH = 8_000;

const navigationSchema = z.strictObject({
  cursor: z.string().max(MAX_CURSOR_LENGTH).optional(),
  back: z.array(z.string().max(MAX_CURSOR_LENGTH)).max(MAX_HISTORY_ENTRIES),
});

type ReportNavigation = z.infer<typeof navigationSchema>;

type ReportSearchParams = {
  cursor?: string | string[];
  back?: string | string[];
};

type ReportPageLinks = {
  first: string | null;
  previous: string | null;
  next: string | null;
};

function decodeHistory(value: string | undefined): string[] | null {
  if (!value) return [];
  if (value.length > MAX_ENCODED_HISTORY_LENGTH) return null;

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    const result = z
      .array(z.string().max(MAX_CURSOR_LENGTH))
      .max(MAX_HISTORY_ENTRIES)
      .safeParse(parsed);

    if (!result.success) return null;
    if (result.data.some((cursor) => !decodeReportsCursor(cursor))) return null;
    return result.data;
  } catch {
    return null;
  }
}

function encodeHistory(history: string[]): string {
  return Buffer.from(JSON.stringify(history), "utf8").toString("base64url");
}

function scalar(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseReportNavigation(
  searchParams: ReportSearchParams | URLSearchParams,
): ReportNavigation {
  const rawCursor =
    searchParams instanceof URLSearchParams
      ? (searchParams.get("cursor") ?? undefined)
      : scalar(searchParams.cursor);
  const rawBack =
    searchParams instanceof URLSearchParams
      ? (searchParams.get("back") ?? undefined)
      : scalar(searchParams.back);

  if (rawCursor && !decodeReportsCursor(rawCursor)) {
    return { cursor: undefined, back: [] };
  }

  const back = decodeHistory(rawBack);
  if (back === null) return { cursor: undefined, back: [] };

  const parsed = navigationSchema.safeParse({ cursor: rawCursor, back });
  return parsed.success ? parsed.data : { cursor: undefined, back: [] };
}

function reportUrl(cursor: string, back: string[]): string {
  const params = new URLSearchParams({ cursor });
  if (back.length > 0) params.set("back", encodeHistory(back));
  return `/reports?${params.toString()}`;
}

function buildReportPageLinks(
  navigation: ReportNavigation,
  nextCursor: string | null,
): ReportPageLinks {
  const currentCursor = navigation.cursor;
  const previousCursor = navigation.back.at(-1);

  return {
    first: currentCursor ? "/reports" : null,
    previous: currentCursor
      ? previousCursor
        ? reportUrl(previousCursor, navigation.back.slice(0, -1))
        : "/reports"
      : null,
    next: nextCursor
      ? reportUrl(
          nextCursor,
          currentCursor
            ? [...navigation.back, currentCursor].slice(-MAX_HISTORY_ENTRIES)
            : [],
        )
      : null,
  };
}

export {
  buildReportPageLinks,
  parseReportNavigation,
  type ReportNavigation,
  type ReportPageLinks,
  type ReportSearchParams,
};
