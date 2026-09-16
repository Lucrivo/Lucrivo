import "server-only";

import {
  requireAdminIdentity,
  type AdminIdentity,
} from "@/modules/auth/services/require-admin";

type AdminAccessState =
  | { status: "setup"; identity: AdminIdentity }
  | { status: "challenge"; identity: AdminIdentity; factorId: string }
  | { status: "authorized"; identity: AdminIdentity }
  | { status: "unavailable"; identity: AdminIdentity };

async function resolveAdminAccessState(): Promise<AdminAccessState> {
  const identity = await requireAdminIdentity();

  try {
    const { data, error } = await identity.supabase.auth.mfa.listFactors();

    if (error || !Array.isArray(data?.totp)) {
      return { status: "unavailable", identity };
    }

    const verified = data.totp.find(
      (factor) => factor.status === "verified" && factor.id.length > 0,
    );

    if (!verified) return { status: "setup", identity };
    if (identity.aal === "aal2") return { status: "authorized", identity };

    return { status: "challenge", identity, factorId: verified.id };
  } catch {
    return { status: "unavailable", identity };
  }
}

export { resolveAdminAccessState, type AdminAccessState };
