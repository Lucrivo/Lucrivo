import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { applicationUrl } from "@/config/application-url";
import {
  passwordSetupFlow,
  passwordSetupPath,
} from "@/modules/auth/services/password-setup-session";

const guestOnlyPaths = new Set(["/login", "/register", "/forgot-password"]);
const passwordSetupPaths = new Set(["/update-password", "/auth/confirm"]);

function redirectKeepingCookies(location: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(location);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const setupFlow = passwordSetupFlow(data?.claims);

  if (setupFlow && !passwordSetupPaths.has(request.nextUrl.pathname)) {
    return redirectKeepingCookies(
      applicationUrl(passwordSetupPath(setupFlow)),
      response,
    );
  }

  if (data?.claims?.sub && guestOnlyPaths.has(request.nextUrl.pathname)) {
    return redirectKeepingCookies(applicationUrl("/auth/continue"), response);
  }

  return response;
}
