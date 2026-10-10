import { AdminOnboardingCatalog } from "@/modules/admin/onboarding/components/admin-onboarding-catalog";
import { AdminOnboardingContacts } from "@/modules/admin/onboarding/components/admin-onboarding-contacts";
import { AdminOnboardingFilters } from "@/modules/admin/onboarding/components/admin-onboarding-filters";
import { AdminOnboardingNav } from "@/modules/admin/onboarding/components/admin-onboarding-nav";
import { AdminOnboardingOverview } from "@/modules/admin/onboarding/components/admin-onboarding-overview";
import {
  parseAdminOnboardingNavigation,
  type SearchParams,
} from "@/modules/admin/onboarding/admin-onboarding.filters";
import {
  getAdminBusinessCatalog,
  getAdminOnboardingContacts,
  getAdminOnboardingOverview,
} from "@/modules/admin/onboarding/get-admin-onboarding.service";

async function AdminOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const navigation = parseAdminOnboardingNavigation(await searchParams);
  let content;

  if (navigation.tab === "contacts") {
    const [data, catalog] = await Promise.all([
      getAdminOnboardingContacts(navigation.filters),
      getAdminBusinessCatalog(),
    ]);
    content = (
      <div className="grid gap-5">
        <AdminOnboardingFilters navigation={navigation} catalog={catalog} />
        <AdminOnboardingContacts data={data} navigation={navigation} />
      </div>
    );
  } else if (navigation.tab === "catalog") {
    const catalog = await getAdminBusinessCatalog();
    content = <AdminOnboardingCatalog catalog={catalog} />;
  } else {
    const overview = await getAdminOnboardingOverview({
      from: navigation.filters.from,
      to: navigation.filters.to,
    });
    content = (
      <div className="grid gap-5">
        <AdminOnboardingFilters
          navigation={navigation}
          catalog={[]}
          variant="overview"
        />
        <AdminOnboardingOverview overview={overview} />
      </div>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-[100rem] grid-cols-[minmax(0,1fr)] gap-6 lg:gap-8">
      <header className="border-primary/10 relative overflow-hidden rounded-3xl border bg-[linear-gradient(135deg,var(--card)_0%,color-mix(in_oklab,var(--primary)_7%,var(--card))_100%)] px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div
          aria-hidden="true"
          className="bg-primary/8 absolute -top-20 -right-16 size-56 rounded-full blur-3xl"
        />
        <div className="relative space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Onboarding
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-6">
            Acompanhe a conclusão dos perfis, os consentimentos e a organização
            do catálogo.
          </p>
        </div>
      </header>
      <AdminOnboardingNav activeTab={navigation.tab} />
      {content}
    </main>
  );
}

export default AdminOnboardingPage;
