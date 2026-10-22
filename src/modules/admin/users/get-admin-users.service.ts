import "server-only";

import { requireAdmin } from "@/modules/auth/services/require-admin";

import {
  adminUserDetailSchema,
  adminUserDiagnosesPageSchema,
  adminUserHistoryPageSchema,
  adminUserListSchema,
  adminUserSubscriptionsPageSchema,
  uuid,
  type AdminUserFilters,
} from "./admin-users.schema";
import { decodeCursor } from "./admin-users.urls";

class AdminUsersUnavailableError extends Error {
  constructor() {
    super("admin_users_unavailable");
    this.name = "AdminUsersUnavailableError";
  }
}

type RpcError = { code?: string } | null;

function failRead(rpc: string, error: RpcError = null): never {
  console.error({
    event: "admin_user_read_failed",
    rpc,
    code: error?.code ?? "invalid_response",
  });
  throw new AdminUsersUnavailableError();
}

async function getAdminUsers(filters: AdminUserFilters) {
  const rpcName = "list_admin_users_v2" as const;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(rpcName, {
    p_query: filters.q || undefined,
    p_state: filters.state,
    p_access: filters.access,
    p_page: filters.page,
    p_page_size: 20,
  });
  if (error) failRead(rpcName, error);
  const parsed = adminUserListSchema.safeParse(data);
  if (!parsed.success) failRead(rpcName);
  return parsed.data;
}

async function getAdminUser(userId: string) {
  const rpcName = "get_admin_user_v2" as const;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(rpcName, { p_user_id: userId });
  if (error) failRead(rpcName, error);
  if (data === null) return null;
  const parsed = adminUserDetailSchema.safeParse(data);
  if (!parsed.success) failRead(rpcName);
  return parsed.data;
}

function diagnosisCursor(rawCursor?: string) {
  const cursor = decodeCursor(rawCursor);
  return cursor && /^\d+$/.test(cursor.id) ? cursor : null;
}

function subscriptionCursor(rawCursor?: string) {
  const cursor = decodeCursor(rawCursor);
  return cursor && uuid.safeParse(cursor.id).success ? cursor : null;
}

function historyCursor(rawCursor?: string) {
  return decodeCursor(rawCursor);
}

async function getAdminUserDiagnoses(userId: string, rawCursor?: string) {
  const rpcName = "list_admin_user_diagnoses_v2" as const;
  const cursor = diagnosisCursor(rawCursor);
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(rpcName, {
    p_user_id: userId,
    p_cursor_created_at: cursor?.createdAt,
    p_cursor_id: cursor?.id,
    p_limit: 20,
  });
  if (error) failRead(rpcName, error);
  const parsed = adminUserDiagnosesPageSchema.safeParse(data);
  if (!parsed.success) failRead(rpcName);
  return parsed.data;
}

async function getAdminUserSubscriptions(userId: string, rawCursor?: string) {
  const rpcName = "list_admin_user_subscriptions_v2" as const;
  const cursor = subscriptionCursor(rawCursor);
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(rpcName, {
    p_user_id: userId,
    p_cursor_created_at: cursor?.createdAt,
    p_cursor_id: cursor?.id,
    p_limit: 20,
  });
  if (error) failRead(rpcName, error);
  const parsed = adminUserSubscriptionsPageSchema.safeParse(data);
  if (!parsed.success) failRead(rpcName);
  return parsed.data;
}

async function getAdminUserHistory(userId: string, rawCursor?: string) {
  const rpcName = "list_admin_user_history_v2" as const;
  const cursor = historyCursor(rawCursor);
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(rpcName, {
    p_user_id: userId,
    p_cursor_occurred_at: cursor?.createdAt,
    p_cursor_event_key: cursor?.id,
    p_limit: 20,
  });
  if (error) failRead(rpcName, error);
  const parsed = adminUserHistoryPageSchema.safeParse(data);
  if (!parsed.success) failRead(rpcName);
  return parsed.data;
}

export {
  AdminUsersUnavailableError,
  getAdminUser,
  getAdminUserDiagnoses,
  getAdminUserHistory,
  getAdminUsers,
  getAdminUserSubscriptions,
};
