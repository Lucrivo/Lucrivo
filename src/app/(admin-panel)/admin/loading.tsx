import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  const metricSkeletons = Array.from({ length: 6 }, (_, index) => index);
  const listSkeletons = Array.from({ length: 5 }, (_, index) => index);

  return (
    <main
      className="mx-auto grid w-full max-w-[100rem] gap-6 lg:gap-8"
      aria-busy="true"
      aria-label="Carregando painel administrativo"
    >
      <p className="sr-only" role="status">
        Carregando indicadores do Lucrivo...
      </p>

      <div className="grid gap-3 rounded-3xl border px-5 py-6 sm:px-7 sm:py-7">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-56 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>

      <section
        aria-label="Carregando indicadores"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {metricSkeletons.map((key) => (
          <Skeleton
            key={key}
            data-skeleton-kind="metric"
            className="h-44 rounded-2xl"
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Skeleton data-skeleton-kind="chart" className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </section>

      <Skeleton data-skeleton-kind="chart" className="h-96 rounded-2xl" />

      <div
        data-skeleton-kind="subscriptions"
        className="grid gap-3 rounded-2xl border p-5"
      >
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
        {listSkeletons.map((key) => (
          <Skeleton key={key} className="h-11 w-full" />
        ))}
      </div>
    </main>
  );
}
