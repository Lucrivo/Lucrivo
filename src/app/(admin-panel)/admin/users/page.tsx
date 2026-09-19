import { cookies } from "next/headers";

import {
  ADMIN_USER_FILTER_COOKIE,
  resolveAdminUserFilters,
} from "@/modules/admin/users/admin-user-filter-cookie";
import { AdminUserList } from "@/modules/admin/users/components/admin-user-list";
import { getAdminUsers } from "@/modules/admin/users/get-admin-users.service";
import type { SearchParams } from "@/modules/admin/users/admin-users.urls";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const filters = resolveAdminUserFilters(
    params,
    cookieStore.get(ADMIN_USER_FILTER_COOKIE)?.value,
  );
  return (
    <AdminUserList data={await getAdminUsers(filters)} filters={filters} />
  );
}
