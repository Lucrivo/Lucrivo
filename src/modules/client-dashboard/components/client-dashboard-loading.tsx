import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ClientDashboardLoading() {
  return (
    <main
      className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-7 pb-10"
      aria-busy="true"
      aria-label="Carregando visão geral dos diagnósticos"
    >
      <p className="sr-only" role="status">
        Carregando visão geral dos diagnósticos...
      </p>
      <header className="grid gap-5 px-1 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:py-4">
        <div className="grid max-w-2xl gap-2">
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-6 w-lg max-w-full" />
        </div>
        <Skeleton className="h-11 w-48 max-w-full" />
      </header>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <section aria-label="Carregando indicadores" className="grid gap-4">
        <div className="grid gap-2 px-1">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <div className="bg-border grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="bg-card grid min-h-36 gap-3 p-5">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="mt-auto h-5 w-2/3" />
            </div>
          ))}
        </div>
      </section>
      <section
        aria-label="Carregando distribuições"
        className="grid gap-4 lg:grid-cols-2"
      >
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </section>
      <section
        aria-label="Carregando relatórios recentes"
        className="grid gap-4"
      >
        <div className="grid gap-2 px-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <div className="divide-border bg-card divide-y overflow-hidden rounded-2xl border">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="grid min-h-20 grid-cols-[minmax(0,1fr)_8rem] items-center gap-4 p-4"
            >
              <div className="grid gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-11 w-28 justify-self-end" />
            </div>
          ))}
        </div>
      </section>
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

export { ClientDashboardLoading };
