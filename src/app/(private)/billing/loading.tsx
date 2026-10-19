import { Skeleton } from "@/components/ui/skeleton";

function BillingPlanSkeleton() {
  return (
    <article
      data-skeleton-kind="billing-plan"
      className="bg-card flex min-w-0 flex-col rounded-2xl border p-7 sm:p-8 @min-[67.5625rem]/page:min-h-[36rem]"
    >
      <div className="grid gap-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-3 pt-7">
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-8 grid gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-auto grid gap-3 pt-8">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </article>
  );
}

export default function BillingLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8"
      aria-busy="true"
      aria-label="Carregando planos e cobrança"
    >
      <p className="sr-only" role="status">
        Carregando seus planos...
      </p>

      <div aria-hidden="true" className="grid gap-8">
        <header className="grid items-end gap-6 @5xl/page:grid-cols-[minmax(0,1fr)_minmax(240px,0.36fr)] @5xl/page:gap-12">
          <div className="grid max-w-3xl gap-3">
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
          <div className="grid gap-2 border-l pl-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </header>

        <section className="grid gap-5">
          <div className="grid gap-2">
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
          <div className="mx-auto grid w-full grid-cols-1 gap-[18px] @min-[67.5625rem]/page:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <BillingPlanSkeleton key={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
