"use server";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import type { RegisterInput } from "@/schemas/auth/register.schema";

type SignupCredentials = Pick<RegisterInput, "email" | "password">;

type SignupActionResult =
  | { status: "authenticated" }
  | { status: "confirmation_required" }
  | {
      status: "error";
      error:
        "weak_password" | "signup_disabled" | "rate_limit" | "signup_failed";
    };

async function signup(
  credentials: SignupCredentials,
): Promise<SignupActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp(credentials);

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

export { signup, type SignupActionResult };
