"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/modules/auth/services/require-admin";

import { actionSchema } from "./admin-users.schema";

type ActionResult =
  | { status: "updated"; version: number }
  | {
      status: "conflict" | "paid_conflict" | "not_found" | "invalid" | "error";
    };

async function changeAdminUser(input: unknown): Promise<ActionResult> {
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const { userId, action, reason, courtesyExpiresAt, expectedVersion } =
    parsed.data;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("change_admin_user_v1", {
    p_user_id: userId,
    p_action: action,
    p_reason: reason,
    // Supabase's generator marks SQL parameters non-null even when this action requires NULL.
    p_courtesy_expires_at: courtesyExpiresAt as string,
    p_expected_version: expectedVersion,
  });
  if (error || !data || typeof data !== "object" || !("status" in data)) {
    return { status: "error" };
  }
  if (
    data.status === "updated" &&
    "version" in data &&
    typeof data.version === "number"
  ) {
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { status: "updated", version: data.version };
  }
  if (
    data.status === "conflict" ||
    data.status === "paid_conflict" ||
    data.status === "not_found"
  ) {
    return { status: data.status };
  }
  return { status: "error" };
}

export { changeAdminUser, type ActionResult };
