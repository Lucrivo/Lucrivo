import { notFound } from "next/navigation";

import { AdminUserDetail } from "@/modules/admin/users/components/admin-user-detail";
import {
  uuid,
  type AdminUserKind,
} from "@/modules/admin/users/admin-users.schema";
import {
  getAdminUser,
  getAdminUserItems,
} from "@/modules/admin/users/get-admin-users.service";

type Params = { userId: string };
type SearchParams = Record<string, string | string[] | undefined>;

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { userId } = await params;
  if (!uuid.safeParse(userId).success) notFound();
  const query = await searchParams;
  const rawTab = scalar(query.tab);
  const tab =
    rawTab === "diagnoses" || rawTab === "subscription" || rawTab === "history"
      ? rawTab
      : "profile";
  const user = await getAdminUser(userId);
  if (!user) notFound();
  const kind: AdminUserKind | null =
    tab === "profile" ? null : tab === "subscription" ? "subscriptions" : tab;
  const items = kind
    ? await getAdminUserItems(userId, kind, scalar(query.cursor))
    : null;
  const from = scalar(query.from);
  let back = "/admin/users";
  if (from && from.length <= 2500) {
    try {
      const parsed = new URL(from, "http://local.invalid");
      if (
        parsed.origin === "http://local.invalid" &&
        parsed.pathname === "/admin/users"
      )
        back = `${parsed.pathname}${parsed.search}`;
    } catch {
      /* Ignore malformed list context. */
    }
  }
  return <AdminUserDetail user={user} tab={tab} items={items} back={back} />;
}
