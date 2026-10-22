"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/modules/auth/services/require-admin";

import { actionSchema } from "./admin-users.schema";

type ActionResult =
  | {
      status: "updated";
      version: number;
      courtesyExpiresAt: string | null;
    }
  | {
      status: "conflict" | "paid_conflict" | "not_found" | "invalid" | "error";
    };

async function changeAdminUser(input: unknown): Promise<ActionResult> {
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const {
    userId,
    action,
    reason,
    courtesyDurationDays,
    courtesyExpiresAt,
    expectedVersion,
  } = parsed.data;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("change_admin_user_v2", {
    p_user_id: userId,
    p_action: action,
    p_reason: reason,
    // Generated RPC arguments are non-nullable even though SQL validates the
    // action-specific NULL combination at runtime.
    p_courtesy_duration_days: courtesyDurationDays as number,
    p_courtesy_expires_at: courtesyExpiresAt as string,
    p_expected_version: expectedVersion,
  });
  if (error || !data || typeof data !== "object" || !("status" in data)) {
    return { status: "error" };
  }
  if (
    data.status === "updated" &&
    "version" in data &&
    typeof data.version === "number" &&
    "state" in data &&
    data.state !== null &&
    typeof data.state === "object" &&
    "courtesyExpiresAt" in data.state &&
    (data.state.courtesyExpiresAt === null ||
      typeof data.state.courtesyExpiresAt === "string")
  ) {
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return {
      status: "updated",
      version: data.version,
      courtesyExpiresAt: data.state.courtesyExpiresAt,
    };
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
