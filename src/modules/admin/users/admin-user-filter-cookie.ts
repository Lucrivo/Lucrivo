import { listFilterSchema, type AdminUserFilters } from "./admin-users.schema";
import { parseFilters, type SearchParams } from "./admin-users.urls";

const ADMIN_USER_FILTER_COOKIE = "lucrivo_admin_user_filters";
const MAX_FILTER_COOKIE_LENGTH = 1024;
const storedFilterSchema = listFilterSchema
  .pick({ q: true, state: true, access: true })
  .strict();

type StoredAdminUserFilters = Pick<AdminUserFilters, "q" | "state" | "access">;

function hasExplicitUserFilters(searchParams: SearchParams) {
  return ["q", "state", "access"].some((key) =>
    Object.prototype.hasOwnProperty.call(searchParams, key),
  );
}

function parseStoredAdminUserFilters(
  raw: string | undefined,
): StoredAdminUserFilters | null {
  if (!raw || raw.length > MAX_FILTER_COOKIE_LENGTH) return null;

  try {
    const parsed = storedFilterSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function resolveAdminUserFilters(
  searchParams: SearchParams,
  rawCookie: string | undefined,
): AdminUserFilters {
  const urlFilters = parseFilters(searchParams);
  if (hasExplicitUserFilters(searchParams)) return urlFilters;

  const stored = parseStoredAdminUserFilters(rawCookie);
  if (!stored) return urlFilters;

  return listFilterSchema.parse({
    ...stored,
    cursor: urlFilters.cursor,
    back: urlFilters.back,
  });
}

export {
  ADMIN_USER_FILTER_COOKIE,
  hasExplicitUserFilters,
  parseStoredAdminUserFilters,
  resolveAdminUserFilters,
  storedFilterSchema,
  type StoredAdminUserFilters,
};
