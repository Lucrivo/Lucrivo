import { NextResponse } from "next/server";

import {
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";
import {
  CLIENT_DASHBOARD_FILTER_COOKIE,
  storedClientDashboardFilterSchema,
} from "@/modules/client-dashboard/client-dashboard-filter-cookie";
import {
  buildClientDashboardHref,
  normalizeClientDashboardFilters,
  toStoredClientDashboardFilters,
} from "@/modules/client-dashboard/client-dashboard.filters";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function authorize() {
  try {
    await requireUser();
    return null;
  } catch (error) {
    return error instanceof AuthRequiredError
      ? json({ error: "unauthorized" }, 401)
      : json({ error: "service_unavailable" }, 503);
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/dashboard",
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

  const parsed = storedClientDashboardFilterSchema.safeParse(input);
  if (!parsed.success) return json({ error: "invalid_filters" }, 400);

  const filters = normalizeClientDashboardFilters({
    ...parsed.data,
    reportId: null,
  });
  const storedFilters = toStoredClientDashboardFilters(filters);
  const response = json({ href: buildClientDashboardHref(filters, {}) }, 200);
  response.cookies.set(
    CLIENT_DASHBOARD_FILTER_COOKIE,
    JSON.stringify(storedFilters),
    {
      ...cookieOptions(),
      maxAge: COOKIE_MAX_AGE_SECONDS,
    },
  );
  return response;
}

async function DELETE() {
  const rejection = await authorize();
  if (rejection) return rejection;

  const response = json({ href: "/dashboard" }, 200);
  response.cookies.set(CLIENT_DASHBOARD_FILTER_COOKIE, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
  return response;
}

export { DELETE, POST };
