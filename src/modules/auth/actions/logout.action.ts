"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

async function logout() {
  let destination = "/login";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) destination = "/login?error=logout_failed";
  } catch {
    destination = "/login?error=logout_failed";
  }

  redirect(destination);
}

export { logout };
