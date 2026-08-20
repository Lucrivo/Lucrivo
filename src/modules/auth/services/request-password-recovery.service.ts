import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

type RequestPasswordRecoveryServiceResult =
  { status: "accepted" } | { status: "error"; error: "request_failed" };

function recoveryRedirectUrl() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return null;

  try {
    const redirectUrl = new URL("/auth/confirm", appUrl);
    if (!["http:", "https:"].includes(redirectUrl.protocol)) return null;

    return redirectUrl.toString();
  } catch {
    return null;
  }
}

async function requestPasswordRecoveryEmail(
  email: string,
): Promise<RequestPasswordRecoveryServiceResult> {
  const redirectTo = recoveryRedirectUrl();
  if (!redirectTo) {
    console.error("Password recovery request failed before reaching Supabase.");
    return { status: "error", error: "request_failed" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("Supabase rejected a password recovery request.");
    }

    return { status: "accepted" };
  } catch {
    console.error("Password recovery request failed before reaching Supabase.");
    return { status: "error", error: "request_failed" };
  }
}

export {
  requestPasswordRecoveryEmail,
  type RequestPasswordRecoveryServiceResult,
};
