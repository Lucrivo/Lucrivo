import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthenticatedHome } from "@/modules/auth/services/resolve-authenticated-home";

export async function GET(request: NextRequest) {
  const destination = await resolveAuthenticatedHome();
  return NextResponse.redirect(new URL(destination, request.url));
}
