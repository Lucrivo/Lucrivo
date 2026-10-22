import { notFound } from "next/navigation";

import { AdminUserDetail } from "@/modules/admin/users/components/admin-user-detail";
import { uuid } from "@/modules/admin/users/admin-users.schema";
import {
  getAdminUser,
  getAdminUserDiagnoses,
  getAdminUserHistory,
  getAdminUserSubscriptions,
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
  const cursor = scalar(query.cursor);
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
  if (tab === "diagnoses") {
    const items = await getAdminUserDiagnoses(userId, cursor);
    return (
      <AdminUserDetail user={user} tab="diagnoses" items={items} back={back} />
    );
  }
  if (tab === "subscription") {
    const items = await getAdminUserSubscriptions(userId, cursor);
    return (
      <AdminUserDetail
        user={user}
        tab="subscription"
        items={items}
        back={back}
      />
    );
  }
  if (tab === "history") {
    const items = await getAdminUserHistory(userId, cursor);
    return (
      <AdminUserDetail user={user} tab="history" items={items} back={back} />
    );
  }
  return <AdminUserDetail user={user} tab="profile" items={null} back={back} />;
}
