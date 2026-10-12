import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import type { RegisterInput } from "@/schemas/auth/register.schema";

type SignupCredentials = Pick<RegisterInput, "email" | "password">;

type SignupServiceResult =
  | { status: "authenticated"; userId: string }
  | { status: "confirmation_required"; userId: string | null }
  | {
      status: "error";
      error:
        "weak_password" | "signup_disabled" | "rate_limit" | "signup_failed";
    };

async function signup(
  credentials: SignupCredentials,
  captchaToken?: string,
): Promise<SignupServiceResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      ...credentials,
      options: { captchaToken },
    });

    if (error) {
      if (error.code === "weak_password")
        return { status: "error", error: "weak_password" };
      if (error.code === "signup_disabled")
        return { status: "error", error: "signup_disabled" };
      if (
        error.code === "over_email_send_rate_limit" ||
        error.code === "over_request_rate_limit"
      ) {
        return { status: "error", error: "rate_limit" };
      }
      return { status: "error", error: "signup_failed" };
    }

    if (data.session) {
      if (!data.user?.id) return { status: "error", error: "signup_failed" };
      return { status: "authenticated", userId: data.user.id };
    }

    const identities = data.user?.identities;
    const userId =
      data.user?.id && Array.isArray(identities) && identities.length > 0
        ? data.user.id
        : null;

    return { status: "confirmation_required", userId };
  } catch {
    return { status: "error", error: "signup_failed" };
  }
}

export { signup, type SignupServiceResult };
