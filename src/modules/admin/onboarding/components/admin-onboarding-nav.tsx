import Link from "next/link";

import type { AdminOnboardingTab } from "../admin-onboarding.schema";

const tabs: Array<{
  label: string;
  tab: AdminOnboardingTab;
  href: string;
}> = [
  { label: "Visão geral", tab: "overview", href: "/admin/onboarding" },
  {
    label: "Contatos",
    tab: "contacts",
    href: "/admin/onboarding?tab=contacts",
  },
  {
    label: "Catálogo",
    tab: "catalog",
    href: "/admin/onboarding?tab=catalog",
  },
];

function AdminOnboardingNav({ activeTab }: { activeTab: AdminOnboardingTab }) {
  return (
    <nav aria-label="Seções do onboarding" className="overflow-x-auto border-b">
      <ul className="flex min-w-max gap-6 px-1">
        {tabs.map((item) => {
          const active = item.tab === activeTab;
          return (
            <li key={item.tab}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`focus-visible:ring-ring relative flex min-h-11 items-center px-1 text-sm font-medium focus-visible:rounded-md focus-visible:ring-2 focus-visible:outline-none ${
                  active
                    ? "text-foreground after:bg-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { AdminOnboardingNav };
