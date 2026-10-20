import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

type PasswordUpdateGate =
  | { status: "ready" }
  | { status: "mfa"; factorId: string }
  | { status: "unavailable" };

async function resolvePasswordUpdateGate(): Promise<PasswordUpdateGate> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;

    if (error || typeof subject !== "string" || subject.length === 0) {
      return { status: "ready" };
    }

    if (data?.claims?.aal === "aal2") return { status: "ready" };

    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error || !Array.isArray(factors.data?.totp)) {
      return { status: "unavailable" };
    }

    const verified = factors.data.totp.find(
      (factor) => factor.status === "verified" && factor.id.length > 0,
    );

    if (!verified) return { status: "ready" };
    return { status: "mfa", factorId: verified.id };
  } catch {
    console.error("Password setup factor lookup failed.");
    return { status: "unavailable" };
  }
}

export { resolvePasswordUpdateGate, type PasswordUpdateGate };
