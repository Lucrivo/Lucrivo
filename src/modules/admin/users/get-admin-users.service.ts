import "server-only";

import { requireAdmin } from "@/modules/auth/services/require-admin";

import {
  adminUserDetailSchema,
  adminUserListSchema,
  cursorSchema,
  itemSchemas,
  uuid,
  type AdminUserFilters,
  type AdminUserKind,
} from "./admin-users.schema";
import { decodeCursor } from "./admin-users.urls";

class AdminUsersUnavailableError extends Error {
  constructor() {
    super("admin_users_unavailable");
    this.name = "AdminUsersUnavailableError";
  }
}

async function getAdminUsers(filters: AdminUserFilters) {
  const { supabase } = await requireAdmin();
  const decoded = decodeCursor(filters.cursor);
  const cursor = decoded && uuid.safeParse(decoded.id).success ? decoded : null;
  const { data, error } = await supabase.rpc("list_admin_users_v1", {
    p_query: filters.q || undefined,
    p_state: filters.state,
    p_access: filters.access,
    p_cursor_created_at: cursor?.createdAt,
    p_cursor_id: cursor?.id,
    p_limit: 20,
  });
  const parsed = adminUserListSchema.safeParse(data);
  if (error || !parsed.success) throw new AdminUsersUnavailableError();
  return parsed.data;
}

async function getAdminUser(userId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("get_admin_user_v1", {
    p_user_id: userId,
  });
  if (error) throw new AdminUsersUnavailableError();
  if (data === null) return null;
  const parsed = adminUserDetailSchema.safeParse(data);
  if (!parsed.success) throw new AdminUsersUnavailableError();
  return parsed.data;
}

async function getAdminUserItems(
  userId: string,
  kind: AdminUserKind,
  rawCursor?: string,
) {
  const { supabase } = await requireAdmin();
  const decoded = decodeCursor(rawCursor);
  const cursor =
    decoded &&
    (kind === "subscriptions"
      ? uuid.safeParse(decoded.id).success
      : /^\d+$/.test(decoded.id))
      ? decoded
      : null;
  const { data, error } = await supabase.rpc("list_admin_user_items_v1", {
    p_user_id: userId,
    p_kind: kind,
    p_cursor_created_at: cursor?.createdAt,
    p_cursor_id: cursor?.id,
    p_limit: 20,
  });
  const parsed = itemSchemas[kind].array();
  const items =
    data && typeof data === "object" && "items" in data
      ? parsed.safeParse(data.items)
      : null;
  const nextCursor =
    data && typeof data === "object" && "nextCursor" in data
      ? cursorSchema.nullable().safeParse(data.nextCursor)
      : null;
  if (error || !items?.success || !nextCursor?.success) {
    throw new AdminUsersUnavailableError();
  }
  return { items: items.data, nextCursor: nextCursor.data };
}

export {
  AdminUsersUnavailableError,
  getAdminUser,
  getAdminUserItems,
  getAdminUsers,
};
