"use server";

import { requestPasswordRecoveryEmail } from "@/modules/auth/services/request-password-recovery.service";
import { passwordRecoveryRequestSchema } from "@/schemas/auth/password-recovery.schema";

type PasswordRecoveryActionState =
  | { status: "success"; outcome: "recovery_requested" }
  | { status: "error"; error: "invalid_email" | "request_failed" }
  | null;

async function requestPasswordRecovery(
  _previousState: PasswordRecoveryActionState,
  formData: FormData,
): Promise<PasswordRecoveryActionState> {
  const parsed = passwordRecoveryRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { status: "error", error: "invalid_email" };
  }

  const result = await requestPasswordRecoveryEmail(parsed.data.email);
  if (result.status === "error") return result;

  return { status: "success", outcome: "recovery_requested" };
}

export { requestPasswordRecovery, type PasswordRecoveryActionState };
