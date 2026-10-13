import { NextResponse } from "next/server";

import {
  AdminMfaRequiredError,
  AdminRequiredError,
  requireAdmin,
} from "@/modules/auth/services/require-admin";
import { AuthRequiredError } from "@/modules/auth/services/require-user";
import {
  ADMIN_USER_FILTER_COOKIE,
  storedFilterSchema,
} from "@/modules/admin/users/admin-user-filter-cookie";
import { listUrl } from "@/modules/admin/users/admin-users.urls";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function authorize() {
  try {
    await requireAdmin();
    return null;
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return json({ error: "unauthorized" }, 401);
    }
    if (
      error instanceof AdminRequiredError ||
      error instanceof AdminMfaRequiredError
    ) {
      return json({ error: "forbidden" }, 403);
    }
    return json({ error: "service_unavailable" }, 503);
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/admin/users",
  };
}

async function POST(request: Request) {
  const rejection = await authorize();
  if (rejection) return rejection;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid_filters" }, 400);
  }

  const parsed = storedFilterSchema.safeParse(input);
  if (!parsed.success) return json({ error: "invalid_filters" }, 400);

  const response = json({ href: listUrl(parsed.data) }, 200);
  response.cookies.set(ADMIN_USER_FILTER_COOKIE, JSON.stringify(parsed.data), {
    ...cookieOptions(),
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

async function DELETE() {
  const rejection = await authorize();
  if (rejection) return rejection;

  const response = json({ href: "/admin/users" }, 200);
  response.cookies.set(ADMIN_USER_FILTER_COOKIE, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
  return response;
}

export { DELETE, POST };
