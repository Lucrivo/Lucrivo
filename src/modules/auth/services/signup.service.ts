import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import type { RegisterInput } from "@/schemas/auth/register.schema";

type SignupCredentials = Pick<RegisterInput, "email" | "password">;

type SignupServiceResult =
  | { status: "authenticated" }
  | { status: "confirmation_required" }
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

    return data.session
      ? { status: "authenticated" }
      : { status: "confirmation_required" };
  } catch {
    return { status: "error", error: "signup_failed" };
  }
}

export { signup, type SignupServiceResult };
