import { Skeleton } from "@/components/ui/skeleton";

function OnboardingFieldSkeleton() {
  return (
    <div data-skeleton-kind="onboarding-field" className="grid gap-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

export default function OnboardingLoading() {
  return (
    <section
      className="w-full"
      aria-busy="true"
      aria-label="Carregando onboarding"
    >
      <p className="sr-only" role="status">
        Preparando os dados do seu negócio...
      </p>

      <div aria-hidden="true">
        <header className="mb-8 grid max-w-2xl gap-3">
          <Skeleton className="h-10 w-[30rem] max-w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </header>

        <div className="grid gap-6">
          <OnboardingFieldSkeleton />
          <OnboardingFieldSkeleton />
          <div className="grid gap-6 sm:grid-cols-2">
            <OnboardingFieldSkeleton />
            <OnboardingFieldSkeleton />
          </div>
          <div className="bg-muted/55 grid gap-3 rounded-xl p-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg sm:w-56" />
        </div>
      </div>
    </section>
  );
}
