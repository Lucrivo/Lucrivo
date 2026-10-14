import { Skeleton } from "@/components/ui/skeleton";

function AccountFieldSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div data-skeleton-kind="account-field" className="grid gap-2">
      <Skeleton className={compact ? "h-4 w-24" : "h-4 w-32"} />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

export default function AccountLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10"
      aria-busy="true"
      aria-label="Carregando sua conta"
    >
      <p className="sr-only" role="status">
        Carregando os dados da sua conta...
      </p>

      <div aria-hidden="true" className="contents">
        <header className="grid max-w-2xl gap-3">
          <Skeleton className="h-10 w-52 max-w-full" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </header>

        <section className="grid max-w-2xl gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </section>

        <div className="flex gap-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-40" />
        </div>

        <section className="w-full">
          <header className="mb-8 grid max-w-2xl gap-3">
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </header>

          <div className="grid gap-6">
            <AccountFieldSkeleton compact />
            <AccountFieldSkeleton compact />
            <div className="grid gap-6 sm:grid-cols-2">
              <AccountFieldSkeleton />
              <AccountFieldSkeleton compact />
            </div>
            <div
              data-skeleton-kind="account-field"
              className="bg-muted/55 grid gap-3 rounded-xl p-4"
            >
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-11 w-full sm:w-40" />
          </div>
        </section>
      </div>
    </main>
  );
}
