"use server";

import {
  isAuthFeatureEnabled,
  normalizeCaptchaToken,
} from "@/config/auth-environment";
import { requestPasswordRecoveryEmail } from "@/modules/auth/services/request-password-recovery.service";
import { passwordRecoveryRequestSchema } from "@/schemas/auth/password-recovery.schema";

type PasswordRecoveryActionState =
  | { status: "success"; outcome: "recovery_requested" }
  | {
      status: "error";
      error: "captcha_required" | "invalid_email" | "request_failed";
    }
  | null;

async function requestPasswordRecovery(
  _previousState: PasswordRecoveryActionState,
  formData: FormData,
): Promise<PasswordRecoveryActionState> {
  const captchaToken = normalizeCaptchaToken(formData.get("captchaToken"));
  if (isAuthFeatureEnabled(process.env.AUTH_CAPTCHA_ENABLED) && !captchaToken) {
    return { status: "error", error: "captcha_required" };
  }

  const parsed = passwordRecoveryRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { status: "error", error: "invalid_email" };
  }

  const result = await requestPasswordRecoveryEmail(
    parsed.data.email,
    captchaToken,
  );
  if (result.status === "error") return result;

  return { status: "success", outcome: "recovery_requested" };
}

export { requestPasswordRecovery, type PasswordRecoveryActionState };
