import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

const otpFlows = {
  email: {
    successPath: "/dashboard",
    failurePath: "/login",
    failureCode: "confirmation_failed",
  },
  recovery: {
    successPath: "/update-password",
    failurePath: "/forgot-password",
    failureCode: "invalid_or_expired_link",
  },
} as const;

type SupportedOtpType = keyof typeof otpFlows;

function isSupportedOtpType(type: string | null): type is SupportedOtpType {
  return type === "email" || type === "recovery";
}

function safeRedirect(request: NextRequest, pathname: string, error?: string) {
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = pathname;
  redirectTo.search = "";
  if (error) redirectTo.searchParams.set("error", error);

  return NextResponse.redirect(redirectTo);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!isSupportedOtpType(type)) {
    const fallback = otpFlows.email;
    return safeRedirect(request, fallback.failurePath, fallback.failureCode);
  }

  const flow = otpFlows[type];
  const failureRedirect = () =>
    safeRedirect(request, flow.failurePath, flow.failureCode);

  if (!tokenHash) return failureRedirect();

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) return failureRedirect();
  } catch {
    return failureRedirect();
  }

  return safeRedirect(request, flow.successPath);
}
