"use server";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { signupSchema, type SignupInput } from "@/schemas/auth/signup.schema";

type SignupActionResult =
  | { status: "authenticated" }
  | { status: "confirmation_required" }
  | {
      status: "error";
      error:
        | "invalid_fields"
        | "weak_password"
        | "signup_disabled"
        | "rate_limit"
        | "signup_failed";
    };

async function signup(credentials: SignupInput): Promise<SignupActionResult> {
  const parsed = signupSchema.safeParse(credentials);
  if (!parsed.success) return { status: "error", error: "invalid_fields" };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp(parsed.data);

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
