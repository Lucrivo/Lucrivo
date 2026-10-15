import { NextResponse } from "next/server";

import { applicationUrl } from "@/config/application-url";
import { resolveAuthenticatedHome } from "@/modules/auth/services/resolve-authenticated-home";

export async function GET() {
  const destination = await resolveAuthenticatedHome();
  return NextResponse.redirect(applicationUrl(destination));
}
