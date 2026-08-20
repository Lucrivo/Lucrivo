"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { loginSchema } from "@/schemas/auth/login.schema";

type LoginActionState = {
  status: "error";
  error:
    "invalid_fields" | "invalid_credentials" | "rate_limit" | "login_failed";
} | null;

async function login(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { status: "error", error: "invalid_fields" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      if (error.code === "over_request_rate_limit")
        return { status: "error", error: "rate_limit" };
      return { status: "error", error: "invalid_credentials" };
    }
  } catch {
    return { status: "error", error: "login_failed" };
  }

  redirect("/dashboard");
}

export { login, type LoginActionState };
