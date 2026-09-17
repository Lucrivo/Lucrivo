import { AdminUserList } from "@/modules/admin/users/components/admin-user-list";
import { getAdminUsers } from "@/modules/admin/users/get-admin-users.service";
import {
  parseFilters,
  type SearchParams,
} from "@/modules/admin/users/admin-users.urls";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseFilters(await searchParams);
  return (
    <AdminUserList data={await getAdminUsers(filters)} filters={filters} />
  );
}
