import {
  cursorSchema,
  listFilterSchema,
  type AdminUserFilters,
} from "./admin-users.schema";

type SearchParams = Record<string, string | string[] | undefined>;

const MAX_ADMIN_PAGE = 1_000_000;

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parsePage(raw: string | undefined) {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 && page <= MAX_ADMIN_PAGE
    ? page
    : 1;
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
    page: parsePage(scalar(params.page)),
  });
  return result.success ? result.data : listFilterSchema.parse({});
}

function listUrl(filters: AdminUserFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.state !== "current") params.set("state", filters.state);
  if (filters.access !== "all") params.set("access", filters.access);
  if (filters.page !== 1) params.set("page", String(filters.page));
  const query = params.toString();
  return `/admin/users${query ? `?${query}` : ""}`;
}

export {
  decodeCursor,
  encodeCursor,
  listUrl,
  parseFilters,
  parsePage,
  type SearchParams,
};
