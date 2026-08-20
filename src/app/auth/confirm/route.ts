import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

function confirmationFailedRedirect(request: NextRequest) {
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/login";
  redirectTo.search = "";
  redirectTo.searchParams.set("error", "confirmation_failed");

  return NextResponse.redirect(redirectTo);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "email") {
    return confirmationFailedRedirect(request);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) return confirmationFailedRedirect(request);
  } catch {
    return confirmationFailedRedirect(request);
  }

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/dashboard";
  redirectTo.search = "";

  return NextResponse.redirect(redirectTo);
}
