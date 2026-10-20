"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { updatePassword } from "@/modules/auth/services/update-password.service";
import { passwordUpdateSchema } from "@/schemas/auth/password-recovery.schema";

type UpdatePasswordActionState = {
  status: "error";
  error:
    | "invalid_fields"
    | "password_mismatch"
    | "weak_password"
    | "mfa_required"
    | "update_failed";
} | null;

type PasswordFlow = "recovery" | "invite";

function passwordFlow(value: FormDataEntryValue | null): PasswordFlow {
  return value === "invite" ? "invite" : "recovery";
}

async function submitPasswordUpdate(
  _previousState: UpdatePasswordActionState,
  formData: FormData,
): Promise<UpdatePasswordActionState> {
  const flow = passwordFlow(formData.get("flow"));
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const passwordMismatch = parsed.error.issues.some(
      (issue) => issue.path[0] === "confirmPassword" && issue.code === "custom",
    );
    const weakPassword = parsed.error.issues.some(
      (issue) => issue.path[0] === "password",
    );

    return {
      status: "error",
      error: passwordMismatch
        ? "password_mismatch"
        : weakPassword
          ? "weak_password"
          : "invalid_fields",
    };
  }

  const result = await updatePassword(parsed.data.password);
  const invalidSessionPath =
    flow === "invite"
      ? "/login?error=invalid_or_expired_invite"
      : "/forgot-password?error=invalid_or_expired_link";
  const successStatus =
    flow === "invite" ? "invite_accepted" : "password_updated";

  if (result.status === "invalid_session") {
    return redirect(invalidSessionPath);
  }

  if (result.status === "update_failed") {
    return { status: "error", error: "update_failed" };
  }

  if (result.status === "mfa_required") {
    return { status: "error", error: "mfa_required" };
  }

  if (result.status === "weak_password") {
    return { status: "error", error: "weak_password" };
  }

  if (result.status === "updated_revocation_failed") {
    return redirect(
      `/login?status=${successStatus}&warning=sessions_not_revoked`,
    );
  }

  return redirect(`/login?status=${successStatus}`);
}

function passwordSetupFailurePath(flow: PasswordFlow) {
  return flow === "invite"
    ? "/update-password?flow=invite&error=sign_out_failed"
    : "/update-password?error=sign_out_failed";
}

async function abandonPasswordSetup(formData: FormData) {
  const flow = passwordFlow(formData.get("flow"));
  const destination = flow === "invite" ? "/login" : "/forgot-password";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (!error) return redirect(destination);
  } catch {
    // A sessão de definição de senha permanece confinada na página atual.
  }

  return redirect(passwordSetupFailurePath(flow));
}

export {
  abandonPasswordSetup,
  submitPasswordUpdate,
  type PasswordFlow,
  type UpdatePasswordActionState,
};
