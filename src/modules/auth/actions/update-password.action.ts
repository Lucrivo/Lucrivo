"use server";

import { redirect } from "next/navigation";

import { updatePassword } from "@/modules/auth/services/update-password.service";
import { passwordUpdateSchema } from "@/schemas/auth/password-recovery.schema";

type UpdatePasswordActionState = {
  status: "error";
  error:
    "invalid_fields" | "password_mismatch" | "weak_password" | "update_failed";
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

export {
  submitPasswordUpdate,
  type PasswordFlow,
  type UpdatePasswordActionState,
};
