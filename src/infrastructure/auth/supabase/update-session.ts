import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const guestOnlyPaths = new Set(["/login", "/register", "/forgot-password"]);

export async function updateSession(request: NextRequest) {
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

  if (data?.claims?.sub && guestOnlyPaths.has(request.nextUrl.pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/dashboard";
    destination.search = "";

    const redirectResponse = NextResponse.redirect(destination);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}
