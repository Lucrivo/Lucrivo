import { Skeleton } from "@/components/ui/skeleton";

export default function BonusLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Carregando bônus"
      className="mx-auto grid w-full max-w-6xl gap-8 pb-10"
    >
      <span role="status" className="sr-only">
        Carregando seus bônus...
      </span>

      <header className="bg-card grid gap-5 rounded-3xl border px-5 py-7 shadow-sm sm:px-8 sm:py-9">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-xl" />
          <Skeleton className="h-11 w-36" />
        </div>
        <Skeleton className="h-5 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </header>

      <section className="grid gap-6" aria-hidden="true">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-full max-w-xl sm:w-[32rem]" />
          </div>
          <Skeleton className="h-10 w-52" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <article
              key={index}
              data-skeleton-kind="bonus-material"
              className="bg-card grid min-h-[23rem] content-between gap-8 rounded-xl border p-5 shadow-sm"
            >
              <div className="grid gap-6">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="size-12 rounded-xl" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
                <div className="grid gap-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
              <Skeleton className="h-11 w-full" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
