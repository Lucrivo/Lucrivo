"use server";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

export async function register(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: true,
  };
}
