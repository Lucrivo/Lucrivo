import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

type UpdatePasswordServiceResult =
  | { status: "updated" }
  | { status: "invalid_session" }
  | { status: "weak_password" }
  | { status: "update_failed" }
  | { status: "updated_revocation_failed" };

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function revokeSessions(
  supabase: ServerClient,
): Promise<UpdatePasswordServiceResult> {
  try {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (!error) return { status: "updated" };
  } catch {
    // A senha já foi alterada; seguimos para a limpeza local de contingência.
  }

  console.error("Password updated, but global session revocation failed.");

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // A falha parcial será comunicada sem expor detalhes da sessão.
  }

  return { status: "updated_revocation_failed" };
}

async function updatePassword(
  password: string,
): Promise<UpdatePasswordServiceResult> {
  try {
    const supabase = await createClient();
    const { data, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError || !data?.claims.sub) {
      return { status: "invalid_session" };
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError?.code === "weak_password") {
      return { status: "weak_password" };
    }
    if (updateError) return { status: "update_failed" };

    return revokeSessions(supabase);
  } catch {
    console.error("Password update failed.");
    return { status: "update_failed" };
  }
}

export { updatePassword, type UpdatePasswordServiceResult };
