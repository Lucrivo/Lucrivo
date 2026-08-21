"use server";

import { redirect } from "next/navigation";

import { updatePassword } from "@/modules/auth/services/update-password.service";
import { passwordUpdateSchema } from "@/schemas/auth/password-recovery.schema";

type UpdatePasswordActionState = {
  status: "error";
  error: "invalid_fields" | "password_mismatch" | "update_failed";
} | null;

async function submitPasswordUpdate(
  _previousState: UpdatePasswordActionState,
  formData: FormData,
): Promise<UpdatePasswordActionState> {
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const passwordMismatch = parsed.error.issues.some(
      (issue) => issue.path[0] === "confirmPassword" && issue.code === "custom",
    );

    return {
      status: "error",
      error: passwordMismatch ? "password_mismatch" : "invalid_fields",
    };
  }

  const result = await updatePassword(parsed.data.password);

  if (result.status === "invalid_session") {
    return redirect("/forgot-password?error=invalid_or_expired_link");
  }

  if (result.status === "update_failed") {
    return { status: "error", error: "update_failed" };
  }

  if (result.status === "updated_revocation_failed") {
    return redirect(
      "/login?status=password_updated&warning=sessions_not_revoked",
    );
  }

  return redirect("/login?status=password_updated");
}

export { submitPasswordUpdate, type UpdatePasswordActionState };
