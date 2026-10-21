import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import type {
  AdminUserDetail as User,
  AdminUserDiagnosesPage,
  AdminUserHistoryPage,
  AdminUserSubscriptionsPage,
} from "../admin-users.schema";
import { encodeCursor } from "../admin-users.urls";
import { AdminUserActions } from "./admin-user-actions";
import { AdminUserDiagnoses } from "./admin-user-diagnoses";
import { AdminUserHistory } from "./admin-user-history";
import { AdminUserProfile } from "./admin-user-profile";
import { AdminUserSubscriptions } from "./admin-user-subscriptions";

type Tab = "profile" | "diagnoses" | "subscription" | "history";
type CommonProps = { user: User; back: string };
type Props = CommonProps &
  (
    | { tab: "profile"; items: null }
    | { tab: "diagnoses"; items: AdminUserDiagnosesPage }
    | { tab: "subscription"; items: AdminUserSubscriptionsPage }
    | { tab: "history"; items: AdminUserHistoryPage }
  );

const tabs: { value: Tab; label: string }[] = [
  { value: "profile", label: "Perfil" },
  { value: "diagnoses", label: "Diagnósticos" },
  { value: "subscription", label: "Assinatura" },
  { value: "history", label: "Histórico" },
];

function AdminUserDetail(props: Props) {
  const { user, tab, back } = props;
  const base = `/admin/users/${user.id}`;
  const context = `from=${encodeURIComponent(back)}`;
  const tabUrl = (value: Tab, cursor?: string) =>
    `${base}?${context}&tab=${value}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  const nextHref =
    props.items?.nextCursor === undefined || props.items.nextCursor === null
      ? null
      : tabUrl(tab, encodeCursor(props.items.nextCursor));

  return (
    <main className="mx-auto grid w-full max-w-5xl min-w-0 gap-6">
      <header className="space-y-4">
        <Link
          href={back}
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm underline-offset-4 hover:underline focus-visible:outline-2"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> Voltar para
          usuários
        </Link>
        <div className="bg-card flex min-w-0 flex-wrap items-start justify-between gap-4 rounded-2xl border px-5 py-6 shadow-sm sm:px-7">
          <div className="max-w-full min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
              {user.fullName ?? user.email}
            </h1>
            {user.fullName && (
              <p className="text-muted-foreground mt-2 text-sm [overflow-wrap:anywhere]">
                {user.email}
              </p>
            )}
            <p className="text-muted-foreground mt-1 text-xs [overflow-wrap:anywhere]">
              ID: {user.id}
            </p>
          </div>
          <AdminUserActions user={user} listContext={back} />
        </div>
      </header>

      <nav
        aria-label="Seções do usuário"
        role="tablist"
        className="flex max-w-full gap-2 overflow-x-auto border-b pb-3"
      >
        {tabs.map((entry) => (
          <Link
            key={entry.value}
            href={tabUrl(entry.value)}
            role="tab"
            aria-selected={tab === entry.value}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 ${tab === entry.value ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {props.tab === "profile" ? (
        <AdminUserProfile user={user} />
      ) : props.tab === "diagnoses" ? (
        <AdminUserDiagnoses page={props.items} nextHref={nextHref} />
      ) : props.tab === "subscription" ? (
        <AdminUserSubscriptions
          user={user}
          page={props.items}
          nextHref={nextHref}
        />
      ) : (
        <AdminUserHistory page={props.items} nextHref={nextHref} />
      )}
    </main>
  );
}

export { AdminUserDetail, type Props as AdminUserDetailProps };
