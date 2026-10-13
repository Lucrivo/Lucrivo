import {
  cursorSchema,
  listFilterSchema,
  type AdminUserFilters,
} from "./admin-users.schema";

type SearchParams = Record<string, string | string[] | undefined>;

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function decodeCursor(raw: string | undefined) {
  if (!raw || raw.length > 500) return null;
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(raw, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }
}

function encodeCursor(cursor: { createdAt: string; id: string }) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function parseFilters(params: SearchParams): AdminUserFilters {
  const result = listFilterSchema.safeParse({
    q: scalar(params.q),
    state: scalar(params.state),
    access: scalar(params.access),
    cursor: scalar(params.cursor),
    back: scalar(params.back),
  });
  return result.success ? result.data : listFilterSchema.parse({});
}

function listUrl(filters: AdminUserFilters, cursor?: string, back?: string) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.state !== "current") params.set("state", filters.state);
  if (filters.access !== "all") params.set("access", filters.access);
  if (cursor) params.set("cursor", cursor);
  if (back) params.set("back", back);
  const query = params.toString();
  return `/admin/users${query ? `?${query}` : ""}`;
}

export { decodeCursor, encodeCursor, listUrl, parseFilters, type SearchParams };
