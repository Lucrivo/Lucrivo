"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/modules/auth/services/require-admin";

import {
  ADMIN_USER_FILTER_COOKIE,
  storedFilterSchema,
} from "./admin-user-filter-cookie";
import { listUrl } from "./admin-users.urls";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

async function persistAdminUserFilters(formData: FormData) {
  await requireAdmin();

  const parsed = storedFilterSchema.safeParse({
    q: formData.get("q"),
    state: formData.get("state"),
    access: formData.get("access"),
  });
  const filters = parsed.success ? parsed.data : storedFilterSchema.parse({});
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_USER_FILTER_COOKIE, JSON.stringify(filters), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin/users",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  redirect(listUrl(filters));
}

async function clearAdminUserFilters() {
  await requireAdmin();
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_USER_FILTER_COOKIE);
  redirect("/admin/users");
}

export { clearAdminUserFilters, persistAdminUserFilters };
