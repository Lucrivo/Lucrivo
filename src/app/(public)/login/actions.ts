"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

export async function login(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "E-mail ou senha inválidos.",
    };
  }

  redirect("/dashboard");
}
